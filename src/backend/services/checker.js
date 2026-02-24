const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ── Keywords that mark the OPENINGS SECTION ───────────────────
const OPENING_SECTION_TITLES = [
  'current opening', 'current opportunit', 'current vacancies',
  'current recruitment', 'current position', 'active opening',
  'active job', 'open position', 'open role', 'job opening',
  'career opportunit', 'latest opening', 'new opening',
  'available position', 'job listing', 'job posting',
  'recruitment notification', 'advertisement', 'notification',
  'apply now', 'ongoing recruitment',
  // Hindi
  'वर्तमान रिक्तियां', 'भर्ती', 'रिक्ति',
];

// ── Signals that section is EMPTY / has no real jobs ─────────
const EMPTY_SIGNALS = [
  'no vacancies', 'no current openings', 'no openings',
  'currently there are no', 'no posts available',
  'no positions available', 'check back later',
  'no active recruitment', 'no job openings',
  'no current vacancies', 'kindly check back later',
  'no open positions', 'no open roles', 'no jobs found',
  'no results found', 'no recruitment',
  'at present no vacancy', 'no data available',
  // Hindi
  'कोई रिक्तियां नहीं', 'कोई पद नहीं', 'वर्तमान में कोई',
];

// ── URLs that are NEVER job links ─────────────────────────────
const SKIP_URLS = [
  'javascript:', 'mailto:', 'tel:', '#',
  'facebook.com', 'twitter.com', 'linkedin.com/company',
  'youtube.com', 'instagram.com', 'whatsapp.com',
  'play.google.com', 'apps.apple.com',
  'login', 'signin', 'signup', 'register',
  'privacy', 'disclaimer', 'terms', 'cookie',
  'sitemap', 'contact', '/faq', '/help',
  'locate-us', '/branches', '/atm',
  'calculator', 'emi', 'fd-calc',
  'indiafirstlife', 'buyonline', 'insurance-apply',
  'loanapply', 'loan-apply', 'applyloan',
  'pmsuryaghar', 'vidyalakshmi', 'pmvidyalaxmi',
  'kfintech', 'nsdl.com', 'rbi.org',
  'bobcrm', 'bobibanking', 'bobcard',
  'dil.bank', 'dil2.bank',
];

// ── Step 1: Find the openings section in page ─────────────────
function findOpeningsSection($) {
  let bestSection = null;
  let bestScore   = 0;

  // Look through headings to find the openings section
  $('h1, h2, h3, h4, h5, section[class], div[class], div[id]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim().toLowerCase();
    const id   = ($(el).attr('id')   || '').toLowerCase();
    const cls  = ($(el).attr('class') || '').toLowerCase();
    const combined = text + ' ' + id + ' ' + cls;

    const matchCount = OPENING_SECTION_TITLES.filter(t => combined.includes(t)).length;
    if (matchCount > 0 && matchCount > bestScore) {
      bestScore   = matchCount;
      bestSection = el;
    }
  });

  if (!bestSection) return null;

  // Get the container — either the element itself or its parent section
  const $el = $(bestSection);
  const tagName = bestSection.tagName?.toLowerCase();

  // If it's a heading, grab the parent container
  if (['h1','h2','h3','h4','h5'].includes(tagName)) {
    // Try to get the surrounding section/article/div
    const parent = $el.closest('section, article, .card, [class*="career"], [class*="job"], [class*="opening"]');
    if (parent.length) return parent;

    // Otherwise get next siblings until next heading
    const container = $el.parent();
    return container.length ? container : null;
  }

  return $el;
}

// ── Step 2: Check if section has real content ─────────────────
function sectionHasRealContent($, section) {
  const text = $(section).text().replace(/\s+/g, ' ').toLowerCase();

  // Check for empty signals
  if (EMPTY_SIGNALS.some(e => text.includes(e))) {
    console.log('[checker] Section has empty signal');
    return false;
  }

  // Must have some links or table rows or list items
  const links    = $(section).find('a').length;
  const rows     = $(section).find('tr').length;
  const items    = $(section).find('li').length;
  const hasLinks = links > 0 || rows > 1 || items > 0;

  // Must have reasonable text length beyond just a heading
  const textLength = text.trim().length;

  console.log(`[checker] Section check — links:${links} rows:${rows} items:${items} textLen:${textLength}`);
  return hasLinks && textLength > 80;
}

// ── Step 3: Extract links from the section ────────────────────
function extractLinksFromSection($, section, baseUrl) {
  const links = [];

  $(section).find('a').each((_, el) => {
    const href  = $(el).attr('href');
    const text  = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || text.length < 2) return;

    // Skip bad URLs
    if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;

    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, baseUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;
    if (SKIP_URLS.some(p => fullUrl.toLowerCase().includes(p))) return;

    // Avoid duplicates
    if (!links.find(l => l.url === fullUrl)) {
      links.push({ url: fullUrl, label: text || 'View Details' });
    }
  });

  return links;
}

// ── Extract description from section ─────────────────────────
function extractDescription($, section) {
  let desc = '';
  $(section).find('p, li, td, h5, h6').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 30 && text.length < 300) {
      desc = text.slice(0, 220);
      return false;
    }
  });
  return desc;
}

// ── Extract title from section ────────────────────────────────
function extractTitle($, section) {
  const heading = $(section).find('h1,h2,h3,h4,h5').first().text().trim();
  if (heading.length > 5 && heading.length < 150) return heading;
  return '';
}

// ── Main fetch + check ────────────────────────────────────────
async function fetchAndCheck(url) {
  try {
    const res = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(res.data);

    // Remove global noise first
    $('script, style, noscript').remove();
    $('nav, header, footer').remove();
    $('[class*="navbar"],[class*="topbar"],[class*="sidenav"]').remove();
    $('[class*="accessibility"],[class*="toolbar"],[class*="breadcrumb"]').remove();
    $('[class*="social"],[class*="share"],[class*="cookie"],[class*="popup"]').remove();
    $('[id*="nav"],[id*="header"],[id*="footer"],[id*="sidebar"]').remove();

    return $;
  } catch (err) {
    console.warn(`[checker] Fetch failed for ${url}: ${err.message}`);
    return null;
  }
}

// ── Check a single company ────────────────────────────────────
async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ═══ ${company.name} ═══`);
  console.log(`[checker] URLs: ${urls.join(', ')}`);

  let allLinks   = [];
  let bestTitle  = '';
  let bestDesc   = '';
  let fingerprint = '';
  let foundContent = false;

  for (const url of urls) {
    console.log(`[checker] → Fetching: ${url}`);

    const $ = await fetchAndCheck(url);
    if (!$) continue;

    // ── Step 1: Find the openings section ──────────────────
    const section = findOpeningsSection($);

    if (!section) {
      console.log(`[checker] No openings section found on ${url}`);

      // Fallback: check if full page body has empty signals
      const bodyText = $('body').text().toLowerCase();
      if (EMPTY_SIGNALS.some(e => bodyText.includes(e))) {
        console.log(`[checker] Page has no vacancy signal`);
        fingerprint += url + ':empty|';
        continue;
      }

      // Fallback: grab any PDF links from the page
      const fallbackLinks = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (
          (href.toLowerCase().includes('.pdf') || href.toLowerCase().match(/\.(doc|docx)$/)) &&
          !SKIP_URLS.some(p => href.toLowerCase().includes(p)) &&
          text.length > 2
        ) {
          const fullUrl = href.startsWith('http') ? href : (() => {
            try { return new URL(href, url).href; } catch { return null; }
          })();
          if (fullUrl && !fallbackLinks.find(l => l.url === fullUrl)) {
            fallbackLinks.push({ url: fullUrl, label: text });
          }
        }
      });

      if (fallbackLinks.length > 0) {
        console.log(`[checker] Fallback: found ${fallbackLinks.length} PDFs`);
        allLinks.push(...fallbackLinks);
        foundContent = true;
        fingerprint += url + ':pdf:' + fallbackLinks.map(l => l.url).join(',') + '|';
      } else {
        fingerprint += url + ':no-section|';
      }
      continue;
    }

    console.log(`[checker] ✓ Found openings section`);

    // ── Step 2: Check if section has real content ───────────
    if (!sectionHasRealContent($, section)) {
      console.log(`[checker] ✗ Section is empty — no real openings`);
      fingerprint += url + ':section-empty|';
      continue;
    }

    console.log(`[checker] ✓ Section has content`);

    // ── Step 3: Extract links, title, description ───────────
    const sectionLinks = extractLinksFromSection($, section, url);
    const title        = extractTitle($, section);
    const desc         = extractDescription($, section);

    console.log(`[checker] ✓ Extracted ${sectionLinks.length} links`);

    if (sectionLinks.length > 0 || desc) {
      foundContent = true;
      allLinks.push(...sectionLinks.filter(l => !allLinks.find(x => x.url === l.url)));
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      fingerprint += url + ':' + sectionLinks.map(l => l.url).join(',') + '|';
    }
  }

  const topLinks = allLinks.slice(0, 6);

  console.log(`[checker] ${company.name} → Final: ${topLinks.length} links, content: ${foundContent}`);

  if (!foundContent && !bestDesc) {
    console.log(`[checker] ${company.name} → SKIP — no real openings found\n`);
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
  }

  company.lastContent = currentContent;
  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ── Daily check ───────────────────────────────────────────────
async function runDailyCheck() {
  const users = await User.find({}).lean();
  console.log(`[checker] Daily run — ${users.length} user(s)`);

  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;

      await Promise.allSettled(companies.map(c => checkCompany(c)));

      const fresh  = await Company.find({ userId: user._id });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
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
      console.error(`[checker] Error for ${user.email}:`, err.message);
    }
  }
}

// ── Email digest ──────────────────────────────────────────────
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
                const label = (u.applyLabels && u.applyLabels[i]) ? u.applyLabels[i] : `Document ${i + 1}`;
                const isPdf = link.toLowerCase().includes('.pdf');
                return `<a href="${link}" style="display:inline-block;margin:4px;padding:8px 16px;background:#ede9fe;color:#6366f1;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">
                  ${isPdf ? '📄' : '📎'} ${label}
                </a>`;
              }).join('')
            : u.applyLink
              ? `<a href="${u.applyLink}" style="display:inline-block;padding:8px 20px;background:#6366f1;color:#fff;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none">Apply Now →</a>`
              : ''
          }
        </div>
      `).join('')
    : `<p style="color:#9ca3af;text-align:center;padding:32px">No new updates today.</p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:22px">⚡ SK Career Upstep</h1>
        <p style="margin:8px 0 0;opacity:0.8;font-size:13px">
          ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>You are monitoring <strong>${companies.length}</strong> compan${companies.length === 1 ? 'y' : 'ies'}.</p>
        <h2 style="font-size:16px;border-bottom:2px solid #6366f1;padding-bottom:8px">
          ${updates.length ? `🔔 ${updates.length} New Update(s)` : '📋 Today\'s Summary'}
        </h2>
        ${updatesHtml}
        <div style="text-align:center;margin-top:24px">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
             style="display:inline-block;padding:13px 36px;background:#6366f1;color:#fff;border-radius:8px;font-weight:800;text-decoration:none">
            Login & Apply →
          </a>
        </div>
      </div>
    </div>
  `;

  await sendMail(user.email, subject, html);
}

// ── Helpers ───────────────────────────────────────────────────
function pageSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const common = [...setA].filter(x => setB.has(x)).length;
  return common / Math.max(setA.size, setB.size, 1);
}

module.exports = { checkCompany, runDailyCheck };