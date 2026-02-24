const { chromium } = require('playwright');
const cheerio = require('cheerio');
const crypto = require('crypto');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ── Configuration & Heuristics ───────────────────────────────
const JOB_KEYWORDS = [
  'vacancy', 'recruitment', 'post', 'notification', 'advertisement', 
  'apply', 'advt', 'circular', 'opening', 'qualification', 'career'
];

const SKIP_URLS = [
  'javascript:', 'mailto:', 'tel:', 'facebook.com', 'twitter.com', 
  'youtube.com', 'instagram.com', 'whatsapp.com', 'linkedin.com'
];

// ── Utility Functions ────────────────────────────────────────
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function generateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ── Playwright Engine (The Universal Filter) ─────────────────
async function fetchRenderedPage(url) {
  let browser;
  try {
    // Launch headless chromium. ignoreHTTPSErrors is crucial for older govt sites
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    
    // Wait until network is idle (no more than 2 requests for 500ms)
    // This ensures JS-rendered job tables have time to populate
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const html = await page.content();
    await browser.close();
    
    const $ = cheerio.load(html);
    
    // Aggressively remove noise to isolate the main content area
    $('script, style, noscript, svg, img, iframe').remove();
    $('[class*="navbar"], [class*="nav"], [class*="menu"]').remove();
    $('[class*="footer"], [id*="footer"]').remove();
    $('[class*="header"], [id*="header"]').remove();
    $('[class*="sidebar"], [class*="social"], [class*="breadcrumb"]').remove();
    
    return $;
  } catch (err) {
    if (browser) await browser.close();
    console.warn(`[checker] Playwright failed for ${url}: ${err.message}`);
    return null;
  }
}

// ── Extract Relevant Links & Content ─────────────────────────
function extractCoreData($, baseUrl) {
  let textContent = $('body').text().replace(/\s+/g, ' ').trim();
  let links = [];

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const onclick = $(el).attr('onclick') || '';
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();
    
    // Check if the link is a hidden JS trigger (very common in Govt sites)
    const isJsTrigger = href.startsWith('#') || href.toLowerCase().includes('javascript:');
    const hasDownloadAction = onclick.toLowerCase().includes('download') || onclick.toLowerCase().includes('file') || onclick.toLowerCase().includes('open');

    // If it's a completely dead link with no onclick, THEN we skip it
    if (isJsTrigger && !hasDownloadAction && rawText.length < 3) return;
    
    // Skip social media and generic phone/mail links
    if (!isJsTrigger && SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
    
    const isJobRelated = JOB_KEYWORDS.some(k => href.toLowerCase().includes(k) || rawText.toLowerCase().includes(k) || onclick.toLowerCase().includes(k));
    const isDocument = /\.(pdf|doc|docx)$/i.test(href) || /download|attachment|getfile/i.test(href) || hasDownloadAction;

    if (isJobRelated || isDocument) {
      try {
        // If it's a JS trigger, we just save the page URL so the user knows where to go to click it
        const fullUrl = isJsTrigger ? baseUrl : new URL(href, baseUrl).href;
        
        if (!links.some(l => l.label === rawText)) {
          links.push({ url: fullUrl, label: rawText || 'View Document/Apply' });
        }
      } catch (e) { /* ignore invalid URLs */ }
    }
  });

  return { textContent, links };
}

// ── Main Check Function ──────────────────────────────────────
async function checkCompany(company) {
  const url = company.careerLink || company.announceLink;
  if (!url) return null;

  console.log(`\n[checker] ══════════════════════════════`);
  console.log(`[checker] Scanning: ${company.name} -> ${url}`);

  const $ = await fetchRenderedPage(url);
  if (!$) {
    console.log(`[checker] ✗ Could not load page.`);
    return null;
  }

  const { textContent, links } = extractCoreData($, url);
  
  if (textContent.length < 50) {
    console.log(`[checker] ✗ Page seems empty after rendering.`);
    return null;
  }

  // Create a fingerprint of the current jobs/links available
  const currentFingerprint = generateHash(textContent + links.map(l => l.url).join(''));

  // Compare with previous state
  const hasChanged = company.lastContent !== currentFingerprint;

  let newUpdate = null;
  if (hasChanged) {
    console.log(`[checker] ✓ Structural change detected! New opportunities likely.`);
    
    const topLinks = links.slice(0, 5); // Take the top 5 most relevant links
    
    newUpdate = {
      title: `Updates found at ${company.name}`,
      description: `The career portal or announcements page has been updated. Please check the portal for new listings or documents.`,
      applyLink: topLinks[0]?.url || url,
      applyLinks: topLinks.map(l => l.url),
      applyLabels: topLinks.map(l => l.label),
      detectedAt: new Date(),
    };
    
    company.updates.unshift(newUpdate);
    if (company.updates.length > 50) company.updates.length = 50;
    
    company.lastContent = currentFingerprint;
  } else {
    console.log(`[checker] - No changes detected since last scan.`);
  }

  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ── Daily Check & Aggregation ────────────────────────────────
async function runDailyCheck() {
  const users = await User.find({}).lean();
  console.log(`[checker] Daily run started for ${users.length} user(s)`);
  
  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;
      
      // Process sequentially to avoid blowing up memory with too many headless browsers
      for (const c of companies) {
        await checkCompany(c);
      }
      
      const fresh = await Company.find({ userId: user._id });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
      const todayUpdates = [];
      
      for (const c of fresh) {
        for (const u of c.updates) {
          if (new Date(u.detectedAt).getTime() >= cutoff) {
            todayUpdates.push({ ...u.toObject(), company: c.name, companyId: c._id, type: c.type });
          }
        }
      }
      
      await sendDigest(user, fresh, todayUpdates);
    } catch (err) {
      console.error(`[checker] Error processing user ${user.email}:`, err.message);
    }
  }
}

// ── Email Digest (Unchanged) ─────────────────────────────────
async function sendDigest(user, companies, updates) {
  const subject = updates.length
    ? `⚡ ${updates.length} new update(s) from your companies — SK Career`
    : `📋 Daily digest: ${companies.length} company(s) checked — SK Career`;

  const updatesHtml = updates.length
    ? updates.map(u => `
        <div style="margin-bottom:16px;padding:20px;border:1px solid #e5e7eb;border-radius:10px">
          <div style="color:#6366f1;font-size:12px;font-weight:700;margin-bottom:6px">${u.company.toUpperCase()}</div>
          <h3 style="margin:0 0 8px;font-size:15px">${u.title}</h3>
          <p style="color:#6b7280;font-size:13px;margin:0 0 12px">${u.description}</p>
          ${u.applyLinks && u.applyLinks.length > 1
            ? u.applyLinks.map((link, i) => {
                const label = u.applyLabels?.[i] || `Document ${i + 1}`;
                const isPdf = link.toLowerCase().includes('.pdf');
                return `<a href="${link}" style="display:inline-block;margin:4px;padding:8px 16px;background:#ede9fe;color:#6366f1;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">${isPdf ? '📄' : '📎'} ${label}</a>`;
              }).join('')
            : u.applyLink
              ? `<a href="${u.applyLink}" style="display:inline-block;padding:8px 20px;background:#6366f1;color:#fff;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none">View Openings →</a>`
              : ''
          }
        </div>`).join('')
    : `<p style="color:#9ca3af;text-align:center;padding:32px">No new updates today.</p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:22px">⚡ SK Career Upstep</h1>
        <p style="margin:8px 0 0;opacity:0.8;font-size:13px">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Monitoring <strong>${companies.length}</strong> compan${companies.length===1?'y':'ies'}.</p>
        <h2 style="font-size:16px;border-bottom:2px solid #6366f1;padding-bottom:8px">${updates.length?`🔔 ${updates.length} New Update(s)`:`📋 Today's Summary`}</h2>
        ${updatesHtml}
        <div style="text-align:center;margin-top:24px">
          <a href="${process.env.FRONTEND_URL||'http://localhost:3000'}" style="display:inline-block;padding:13px 36px;background:#6366f1;color:#fff;border-radius:8px;font-weight:800;text-decoration:none">Login & Apply →</a>
        </div>
      </div>
    </div>`;

  await sendMail(user.email, subject, html);
}

module.exports = { checkCompany, runDailyCheck };