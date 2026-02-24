const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

// Signals that mean "no jobs right now" — skip the page entirely
const EMPTY_SIGNALS = [
  'no vacancies', 'no current openings', 'no openings available',
  'currently there are no vacancies', 'no posts available',
  'no positions available', 'check back later', 'no active recruitment',
  'no job openings currently', 'no current vacancies',
  'kindly check back later', 'no open positions',
  'no recruitment currently', 'at present no vacancy',
  'no current opportunities',
  'कोई रिक्तियां नहीं', 'कोई पद नहीं', 'वर्तमान में कोई रिक्ति',
];

// These words near a link = it's probably a job link
const JOB_CONTEXT = [
  'vacancy', 'vacancies', 'recruitment', 'opening', 'post',
  'notification', 'advertisement', 'advt', 'circular',
  'apply', 'application', 'last date', 'closing date',
  'job title', 'description', 'qualification', 'experience',
  'registration', 'link for', 'date to apply', 'published',
  'due date', 'start date', 'click here for details',
  'scheme and syllabus', 'direct recruitment',
];

// Link text that means it IS a job link
const JOB_LINK_TEXT = [
  'apply', 'apply now', 'apply online', 'register', 'registration',
  'click here', 'click here for details', 'notification', 'advertisement',
  'advt', 'circular', 'details', 'view details', 'download',
  'scheme', 'syllabus', 'recruitment', 'vacancy', 'job details',
  'know more', 'read more', 'view more',
];

// URL patterns that confirm it's a job link
const JOB_URL_PATTERNS = [
  '.pdf', '.doc', '.docx',
  '/job', '/jobs', '/career', '/careers', '/vacancy', '/vacancies',
  '/recruit', '/recruitment', '/opening', '/openings',
  '/apply', '/application', '/notification', '/advertisement',
  '/circular', '/advt', 'attachment', 'getfile', 'download',
  'image/get', 'getattachment', 'getcareer',
  // External apply portals common in Indian PSUs
  'ibps.in', 'ssc.nic.in', 'upsconline.nic.in', 'nta.ac.in',
  'crpd.sbi', 'bankbarodacrpd', 'externalexam',
  'ora.', 'iocl.com', 'ntpccareers', 'bhelonline',
];

// Noise selectors — always remove these
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe',
  'nav', 'header', 'footer',
  '[class*="nav"]', '[class*="menu"]', '[class*="header"]',
  '[class*="footer"]', '[class*="sidebar"]', '[class*="topbar"]',
  '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
  '[class*="social"]', '[class*="share"]', '[class*="chat"]',
  '[class*="breadcrumb"]', '[class*="accessibility"]',
  '[id*="nav"]', '[id*="menu"]', '[id*="header"]',
  '[id*="footer"]', '[id*="sidebar"]', '[id*="chat"]',
];

// ─────────────────────────────────────────────────────────────
// SMART FETCH — axios first, Puppeteer fallback
// ─────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function smartFetch(url) {
  // ── Layer 1: Fast axios ──────────────────────────────────
  try {
    const res  = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const $    = cheerio.load(html);
    removeNoise($);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    if (text.length > 400) {
      console.log(`[fetch] axios OK ${text.length} chars`);
      return $;
    }
    console.log(`[fetch] JS shell detected (${text.length} chars) — trying Puppeteer`);
  } catch (e) {
    console.warn(`[fetch] axios failed: ${e.message}`);
  }

  // ── Layer 2: Puppeteer for JS-rendered pages ─────────────
  return await puppeteerFetch(url);
}

async function puppeteerFetch(url) {
  let browser;
  try {
    let puppeteer, execPath, args;
    try {
      const chromium = require('@sparticuz/chromium');
      puppeteer = require('puppeteer-core');
      execPath  = await chromium.executablePath();
      args      = chromium.args;
    } catch {
      puppeteer = require('puppeteer');
      execPath  = undefined;
      args      = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
    }

    browser = await puppeteer.launch({
      executablePath: execPath,
      args,
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    await page.setUserAgent(UA);

    // Block images/fonts to load faster
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image','font','media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500)); // wait for React/Angular hydration

    const html = await page.content();
    await browser.close(); browser = null;

    const $ = cheerio.load(html);
    removeNoise($);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    console.log(`[fetch] Puppeteer OK ${text.length} chars`);
    return $;
  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    console.warn(`[fetch] Puppeteer failed: ${e.message}`);
    return null;
  }
}

function removeNoise($) {
  NOISE_SELECTORS.forEach(sel => { try { $(sel).remove(); } catch {} });
}

// ─────────────────────────────────────────────────────────────
// UNIVERSAL LINK SCORER
// Score every link on the page — highest scores = job links
// ─────────────────────────────────────────────────────────────

function scoreLink(href, linkText, contextText) {
  let score = 0;
  const url  = href.toLowerCase();
  const text = linkText.toLowerCase().trim();
  const ctx  = contextText.toLowerCase();

  // Hard skip — never job links
  if (!href || href === '#' || href.startsWith('#')) return -1;
  if (['javascript:', 'mailto:', 'tel:'].some(p => href.startsWith(p))) return -1;
  if (text.length < 2) return -1;

  // Skip pure social/app links
  const hardSkip = ['facebook.com','twitter.com','youtube.com','instagram.com',
                     'whatsapp.com','play.google.com','apps.apple.com','linkedin.com/company'];
  if (hardSkip.some(p => url.includes(p))) return -1;

  // ── URL signals ──────────────────────────────────────────
  if (url.includes('.pdf')) score += 8;
  if (url.match(/\.(doc|docx)$/)) score += 7;
  if (JOB_URL_PATTERNS.some(p => url.includes(p))) score += 4;

  // ── Link text signals ────────────────────────────────────
  if (JOB_LINK_TEXT.some(t => text.includes(t))) score += 4;
  if (text.includes('apply')) score += 3;
  if (text.includes('notification') || text.includes('advertisement')) score += 3;
  if (text.includes('vacancy') || text.includes('recruitment')) score += 3;

  // ── Context signals (surrounding row/card text) ──────────
  const ctxHits = JOB_CONTEXT.filter(k => ctx.includes(k)).length;
  score += Math.min(ctxHits * 2, 10); // up to 10 pts from context

  // ── Bonus: context has dates (last date, closing date) ───
  if (ctx.match(/\d{2}[.\-/]\d{2}[.\-/]\d{4}/) || ctx.match(/\d{4}-\d{2}-\d{2}/)) score += 2;

  return score;
}

// ─────────────────────────────────────────────────────────────
// EXTRACT ALL JOB LINKS FROM PAGE
// ─────────────────────────────────────────────────────────────

function extractJobLinks($, pageUrl) {
  const scored = [];

  $('a').each((_, el) => {
    const href    = ($(el).attr('href') || '').trim();
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();

    // Get context — parent row, card, or div (up to 600 chars)
    const context = $(el)
      .closest('tr, li, article, .card, [class*="card"], div, section')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .slice(0, 600);

    const score = scoreLink(href, rawText, context);
    if (score < 3) return; // below threshold

    // Resolve URL
    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, pageUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;

    // Deduplicate — keep highest score
    const existing = scored.find(l => l.url === fullUrl);
    if (existing) {
      if (score > existing.score) { existing.score = score; existing.label = rawText; }
    } else {
      scored.push({ url: fullUrl, label: rawText, score });
    }
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  console.log(`[extract] ${scored.length} links scored ≥3:`);
  scored.slice(0, 8).forEach(l => console.log(`   [${l.score}] ${l.label} → ${l.url}`));

  return scored.slice(0, 6); // top 6
}

// ─────────────────────────────────────────────────────────────
// EXTRACT TITLE & DESCRIPTION
// ─────────────────────────────────────────────────────────────

function extractTitle($) {
  // Try page h1/h2 that looks like a jobs section title
  let title = '';
  $('h1, h2, h3').each((_, el) => {
    const t = $(el).text().trim();
    const l = t.toLowerCase();
    if (t.length > 5 && t.length < 150 &&
        ['job','career','vacanc','recruit','opportunit','opening'].some(k => l.includes(k))) {
      title = t; return false;
    }
  });
  return title;
}

function extractDesc($) {
  let desc = '';
  $('p, li, td').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 40 && t.length < 400 &&
        JOB_CONTEXT.some(k => t.toLowerCase().includes(k))) {
      desc = t.slice(0, 220); return false;
    }
  });
  return desc;
}

// ─────────────────────────────────────────────────────────────
// MAIN CHECK FUNCTION
// ─────────────────────────────────────────────────────────────

async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ════════════════════════════`);
  console.log(`[checker] ${company.name}`);
  console.log(`[checker] URLs: ${urls.join(' | ')}`);

  let allLinks    = [];
  let bestTitle   = '';
  let bestDesc    = '';
  let fingerprint = '';
  let foundContent = false;

  for (const url of urls) {
    console.log(`\n[checker] → ${url}`);

    const $ = await smartFetch(url);
    if (!$) {
      console.log(`[checker] ✗ Could not fetch ${url}`);
      fingerprint += url + ':fetch-failed|';
      continue;
    }

    // ── STEP 1: Full page empty check ────────────────────────
    const bodyText = $('body').text().toLowerCase();
    if (EMPTY_SIGNALS.some(e => bodyText.includes(e.toLowerCase()))) {
      console.log(`[checker] ✗ Page says no vacancies — skip`);
      fingerprint += url + ':no-vacancy|';
      continue;
    }
    console.log(`[checker] ✓ Page has potential content`);

    // ── STEP 2: Score and extract all job links ───────────────
    const links = extractJobLinks($, url);
    const title = extractTitle($);
    const desc  = extractDesc($);

    if (links.length > 0) {
      console.log(`[checker] ✓ Found ${links.length} job links`);
      foundContent = true;
      links.forEach(l => {
        if (!allLinks.find(x => x.url === l.url)) allLinks.push(l);
      });
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      fingerprint += url + ':' + links.map(l => l.url).join(',') + '|';
    } else {
      // Page has content but no scoreable links (e.g. BOB JS-rendered job listings)
      // Use the page URL itself as the link — it IS the vacancies page
      console.log(`[checker] ~ No job links found — using page URL (content confirmed)`);
      foundContent = true;
      if (!bestTitle) bestTitle = title || `Current Opportunities at ${company.name}`;
      if (!bestDesc  && desc)  bestDesc = desc;
      allLinks.push({ url, label: 'View Current Opportunities', score: 1 });
      fingerprint += url + ':page-url|';
    }
  }

  const topLinks = allLinks.slice(0, 6);
  console.log(`\n[checker] RESULT: ${company.name} — ${topLinks.length} links, content: ${foundContent}`);

  if (!foundContent) {
    console.log(`[checker] → SKIP — nothing found\n`);
    company.lastChecked = new Date();
    await company.save();
    return null;
  }

  const currentContent = fingerprint + bestDesc;
  const changed = company.lastContent
    ? pageSimilarity(company.lastContent, currentContent) < 0.93
    : true;

  let newUpdate = null;
  if (changed) {
    newUpdate = {
      title:       bestTitle || `New opening at ${company.name}`,
      description: bestDesc  || `${company.name} has posted new career information.`,
      applyLink:   topLinks[0]?.url || company.careerLink || '',
      applyLinks:  topLinks.map(l => l.url),
      applyLabels: topLinks.map(l => l.label),
      detectedAt:  new Date(),
    };
    company.updates.unshift(newUpdate);
    if (company.updates.length > 50) company.updates.length = 50;
    console.log(`[checker] ✓ Update created: "${newUpdate.title}"`);
  } else {
    console.log(`[checker] ~ No change detected`);
  }

  company.lastContent = currentContent;
  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ─────────────────────────────────────────────────────────────
// DAILY CHECK
// ─────────────────────────────────────────────────────────────

async function runDailyCheck() {
  const users = await User.find({}).lean();
  console.log(`[checker] Daily run — ${users.length} user(s)`);

  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;

      // Run checks sequentially to avoid memory issues with Puppeteer
      for (const c of companies) {
        try { await checkCompany(c); } catch (e) { console.error(`[checker] Error on ${c.name}:`, e.message); }
      }

      const fresh  = await Company.find({ userId: user._id });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const todayUpdates = [];

      for (const c of fresh) {
        for (const u of c.updates) {
          if (new Date(u.detectedAt).getTime() >= cutoff)
            todayUpdates.push({ ...u.toObject(), company: c.name, companyId: c._id, type: c.type });
        }
      }

      await sendDigest(user, fresh, todayUpdates);
    } catch (err) {
      console.error(`[checker] Error for ${user.email}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// EMAIL DIGEST
// ─────────────────────────────────────────────────────────────

async function sendDigest(user, companies, updates) {
  const subject = updates.length
    ? `⚡ ${updates.length} new update(s) from your companies — SK Career`
    : `📋 Daily digest: ${companies.length} company(s) checked — SK Career`;

  const updatesHtml = updates.length
    ? updates.map(u => `
        <div style="margin-bottom:16px;padding:20px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa">
          <div style="color:#6366f1;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:6px">${u.company}</div>
          <h3 style="margin:0 0 8px;font-size:15px;color:#111">${u.title}</h3>
          <p style="color:#6b7280;font-size:13px;margin:0 0 12px;line-height:1.5">${u.description}</p>
          <div>
          ${u.applyLinks && u.applyLinks.length > 1
            ? u.applyLinks.map((link, i) => {
                const label  = u.applyLabels?.[i] || `Document ${i + 1}`;
                const isPdf  = link.toLowerCase().includes('.pdf');
                return `<a href="${link}" target="_blank"
                  style="display:inline-block;margin:4px 4px 0 0;padding:7px 14px;
                  background:#ede9fe;color:#6366f1;border-radius:6px;
                  font-size:12px;font-weight:700;text-decoration:none">
                  ${isPdf ? '📄' : '🔗'} ${label}
                </a>`;
              }).join('')
            : u.applyLink
              ? `<a href="${u.applyLink}" target="_blank"
                  style="display:inline-block;padding:9px 22px;background:#6366f1;
                  color:#fff;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none">
                  View Openings →
                </a>`
              : ''
          }
          </div>
        </div>`).join('')
    : `<p style="color:#9ca3af;text-align:center;padding:32px 0">No new updates today. We'll keep watching!</p>`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:auto;background:#fff">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px;color:#fff;font-weight:800">⚡ SK Career Upstep</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px">
          ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>
      <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 4px;color:#374151">Hi <strong>${user.name}</strong>,</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px">
          Monitoring <strong>${companies.length}</strong> organisation${companies.length !== 1 ? 's' : ''} for you.
        </p>
        <h2 style="font-size:15px;font-weight:700;color:#111;border-bottom:2px solid #6366f1;padding-bottom:10px;margin:0 0 20px">
          ${updates.length ? `🔔 ${updates.length} New Update${updates.length !== 1 ? 's' : ''}` : `📋 Today's Summary`}
        </h2>
        ${updatesHtml}
        <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #f3f4f6">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
             style="display:inline-block;padding:13px 36px;background:#6366f1;
             color:#fff;border-radius:8px;font-weight:800;text-decoration:none;font-size:14px">
            Open SK Career →
          </a>
        </div>
      </div>
    </div>`;

  await sendMail(user.email, subject, html);
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function pageSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const common = [...setA].filter(x => setB.has(x)).length;
  return common / Math.max(setA.size, setB.size, 1);
}

module.exports = { checkCompany, runDailyCheck };