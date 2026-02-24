const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const OPENING_SECTION_TITLES = [
  'current opening', 'current opportunit', 'current vacanc',
  'current recruitment', 'current position', 'active opening',
  'active vacanc', 'open position', 'open role', 'job opening',
  'job listing', 'career opportunit', 'latest opening', 'new opening',
  'available position', 'recruitment notification',
  'ongoing recruitment', 'vacancies', 'vacancy',
  'recruitment', 'advertisement', 'notification',
  'वर्तमान रिक्तियां', 'भर्ती', 'रिक्ति',
];

const EMPTY_SIGNALS = [
  'no vacancies', 'no current openings', 'no openings',
  'currently there are no', 'no posts available',
  'no positions available', 'check back later',
  'no active recruitment', 'no job openings',
  'no current vacancies', 'kindly check back later',
  'no open positions', 'no open roles', 'no jobs found',
  'no results found', 'no recruitment currently',
  'at present no vacancy', 'no data available',
  'no current opportunities',
  'कोई रिक्तियां नहीं', 'कोई पद नहीं', 'वर्तमान में कोई',
];

const SKIP_URLS = [
  'javascript:', 'mailto:', 'tel:',
  'facebook.com', 'twitter.com', 'youtube.com',
  'instagram.com', 'whatsapp.com',
  'play.google.com', 'apps.apple.com',
  'linkedin.com/company',
];

const JOB_CONTEXT_WORDS = [
  'vacancy', 'recruitment', 'post', 'notification',
  'advertisement', 'closing', 'last date', 'apply',
  'advt', 'circular', 'opening', 'qualification',
  'experience', 'date of publishing',
];

// ─────────────────────────────────────────────────────────────
// SMART FETCH — axios first, Puppeteer fallback for JS sites
// ─────────────────────────────────────────────────────────────

const AXIOS_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function smartFetch(url) {
  // ── Layer 1: Fast axios fetch ────────────────────────────
  try {
    const res  = await axios.get(url, { timeout: 15000, headers: AXIOS_HEADERS });
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const $    = cheerio.load(html);
    removeNoise($);

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // If page has real content — use it directly (CEL, Balmer Lawrie, UPSC etc.)
    if (bodyText.length > 400) {
      console.log(`[fetch] axios OK (${bodyText.length} chars) — ${url}`);
      return { $, method: 'axios' };
    }

    // Too little content — page is a JS shell (SEBI, BOB, etc.)
    console.log(`[fetch] axios got JS shell (${bodyText.length} chars) — trying Puppeteer`);
  } catch (err) {
    console.warn(`[fetch] axios failed: ${err.message} — trying Puppeteer`);
  }

  // ── Layer 2: Puppeteer for JS-rendered pages ─────────────
  return await puppeteerFetch(url);
}

async function puppeteerFetch(url) {
  let browser;
  try {
    // Support both Railway (@sparticuz/chromium) and local (puppeteer)
    let puppeteer, executablePath, args, headless;

    try {
      const chromium = require('@sparticuz/chromium');
      puppeteer      = require('puppeteer-core');
      executablePath = await chromium.executablePath();
      args           = chromium.args;
      headless       = chromium.headless;
    } catch {
      // Local dev fallback
      puppeteer      = require('puppeteer');
      executablePath = undefined;
      args           = ['--no-sandbox', '--disable-setuid-sandbox'];
      headless       = true;
    }

    browser = await puppeteer.launch({ executablePath, args, headless, defaultViewport: { width: 1280, height: 800 } });

    const page = await browser.newPage();
    await page.setUserAgent(AXIOS_HEADERS['User-Agent']);

    // Block images/fonts/media to speed up load
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image','font','media','stylesheet'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for React/Angular to hydrate
    await new Promise(r => setTimeout(r, 2500));

    const html = await page.content();
    await browser.close();
    browser = null;

    const $ = cheerio.load(html);
    removeNoise($);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    console.log(`[fetch] Puppeteer OK (${bodyText.length} chars) — ${url}`);
    return { $, method: 'puppeteer' };

  } catch (err) {
    if (browser) { try { await browser.close(); } catch {} }
    console.warn(`[fetch] Puppeteer failed: ${err.message}`);
    return null;
  }
}

// Remove nav/footer noise from cheerio instance
function removeNoise($) {
  $('script, style, noscript').remove();
  $('nav, header, footer').remove();
  $('[class*="navbar"],[class*="topbar"],[class*="sidenav"],[class*="menu"]').remove();
  $('[class*="accessibility"],[class*="toolbar"],[class*="breadcrumb"]').remove();
  $('[class*="social"],[class*="share"],[class*="cookie"],[class*="popup"],[class*="banner"]').remove();
  $('[id*="nav"],[id*="header"],[id*="footer"],[id*="sidebar"],[id*="menu"]').remove();
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u0900-\u097f'-]/g, ' ')
    .trim();
}

function containsAny(text, phrases) {
  const n = normalize(text);
  return phrases.some(p => n.includes(normalize(p)));
}

function hasJobContext($, el) {
  const context = $(el).closest('tr, li, div, p, td').text().toLowerCase();
  return JOB_CONTEXT_WORDS.some(k => context.includes(k));
}

function isNavLink(fullUrl, pageUrl) {
  try {
    const link = new URL(fullUrl);
    const page = new URL(pageUrl);
    if (link.hostname !== page.hostname) return false;

    const linkPath = link.pathname.toLowerCase().replace(/\/$/, '');
    const pagePath = page.pathname.toLowerCase().replace(/\/$/, '');
    if (linkPath === pagePath) return false;

    // Allow docs and job paths
    const isDoc = linkPath.match(/\.(pdf|doc|docx)$/) ||
      ['attachment','download','getfile','getcareer',
       'notification','advertisement','advt','circular',
       'image/get','getattachment'].some(p => linkPath.includes(p));
    if (isDoc) return false;

    const isJobPath = ['/job','/recruit','/vacancy','/opening',
                       '/apply','/notification','/advertisement'].some(p => linkPath.includes(p));
    if (isJobPath) return false;

    // Block parent path e.g. /career when on /career/current-opportunities
    if (pagePath.startsWith(linkPath + '/')) return true;

    // Block sibling paths e.g. /career/final-results
    const parentPath = pagePath.split('/').slice(0, -1).join('/');
    if (linkPath.startsWith(parentPath + '/') && linkPath !== pagePath) return true;

    return false;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────
// EXTRACTION FUNCTIONS (unchanged logic)
// ─────────────────────────────────────────────────────────────

function pageIsEmpty($) {
  return containsAny($('body').text(), EMPTY_SIGNALS);
}

function findOpeningsSection($) {
  let bestEl = null, bestScore = 0;

  $('h1, h2, h3, h4, h5').each((_, el) => {
    const score = OPENING_SECTION_TITLES.filter(t => containsAny($(el).text(), [t])).length;
    if (score > bestScore) { bestScore = score; bestEl = el; }
  });

  $('section, article, div').each((_, el) => {
    const combined = ($(el).attr('id') || '') + ' ' + ($(el).attr('class') || '');
    const score = OPENING_SECTION_TITLES.filter(t => containsAny(combined, [t])).length;
    if (score > bestScore) { bestScore = score; bestEl = el; }
  });

  if (!bestEl) return null;

  const tag = bestEl.tagName?.toLowerCase();
  if (['h1','h2','h3','h4','h5'].includes(tag)) {
    const parent = $(bestEl).closest(
      'section, article, [class*="career"], [class*="job"], [class*="opening"], [class*="opportunit"], [class*="vacancy"], [class*="recruit"]'
    );
    if (parent.length) return parent;
    return $(bestEl).parent();
  }
  return $(bestEl);
}

function sectionHasRealContent($, section) {
  const text = $(section).text();
  if (containsAny(text, EMPTY_SIGNALS)) {
    console.log('[checker] ✗ Section has empty signal'); return false;
  }
  let emptyJobTable = false;
  $(section).find('table').each((_, table) => {
    const isJob = containsAny($(table).text(), ['vacancy','position','post','role','qualification']);
    if (isJob && $(table).find('tbody tr').length === 0) { emptyJobTable = true; return false; }
  });
  if (emptyJobTable) { console.log('[checker] ✗ Empty job table'); return false; }

  const links = $(section).find('a').length;
  const rows  = $(section).find('tbody tr, li').length;
  const tlen  = text.replace(/\s+/g, ' ').trim().length;
  console.log(`[checker] Section — links:${links} rows:${rows} textLen:${tlen}`);
  return tlen > 60 && (links > 0 || rows > 0);
}

function findJobTable($, el) {
  let found = null;
  $(el).find('table').each((_, table) => {
    const h = $(table).find('thead, tr').first().text();
    if (containsAny(h, ['download','notification','recruitment','vacancy','closing','publishing','date of'])) {
      found = table; return false;
    }
  });
  return found;
}

function collectDocumentLinks($el, baseUrl, $) {
  const links = [];
  const DOC_URL_PATTERNS = [
    '.pdf', '.doc', '.docx',
    'attachment', 'getfile', 'getdoc', 'getcareer',
    'advt', 'advertisement', 'circular',
    'careerattachment', 'image/get', 'getattachment', 'filedownload',
  ];
  const DOC_LINK_PHRASES = [
    'advertisement', 'notification', 'apply online',
    'application form', 'advt', 'circular',
    'recruitment', 'vacancy details', 'click here to apply',
    'brochure', 'detailed',
  ];

  let searchIn;
  if ($el) {
    const jobTable = findJobTable($, $el);
    searchIn = jobTable ? $(jobTable).find('tbody tr a') : $($el).find('a');
  } else {
    searchIn = $('a');
  }

  searchIn.each((_, el) => {
    const href    = $(el).attr('href') || '';
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href === '#' || href.startsWith('#')) return;
    if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;

    const isDocUrl  = DOC_URL_PATTERNS.some(p => href.toLowerCase().includes(p));
    const isDocText = containsAny(rawText, DOC_LINK_PHRASES);
    if (!isDocUrl && !isDocText) return;
    if (!hasJobContext($, el)) { console.log(`   [skip no-context] ${rawText}`); return; }

    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, baseUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;
    if (SKIP_URLS.some(p => fullUrl.toLowerCase().includes(p))) return;
    if (isNavLink(fullUrl, baseUrl)) { console.log(`   [skip nav] ${rawText}`); return; }
    if (links.find(l => l.url === fullUrl)) return;
    links.push({ url: fullUrl, label: rawText || 'View Document' });
  });

  return links;
}

function extractLinks($, section, pageUrl) {
  const links = [];

  const jobTable = findJobTable($, section);
  if (jobTable) {
    console.log('[checker] Job table — tbody only');
    $(jobTable).find('tbody tr').each((_, row) => {
      $(row).find('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!href || href === '#' || href.startsWith('#') || text.length < 2) return;
        if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
        const fullUrl = href.startsWith('http') ? href : (() => {
          try { return new URL(href, pageUrl).href; } catch { return null; }
        })();
        if (!fullUrl || isNavLink(fullUrl, pageUrl)) return;
        if (links.find(l => l.url === fullUrl)) return;
        links.push({ url: fullUrl, label: text });
      });
    });
    return links;
  }

  $(section).find('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href === '#' || href.startsWith('#') || text.length < 2) return;
    if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, pageUrl).href; } catch { return null; }
    })();
    if (!fullUrl || isNavLink(fullUrl, pageUrl)) return;
    if (links.find(l => l.url === fullUrl)) return;
    links.push({ url: fullUrl, label: text });
  });

  return links;
}

function extractTitle($, section) {
  const h = $(section).find('h1,h2,h3,h4,h5').first().text().trim();
  return (h.length > 5 && h.length < 150) ? h : '';
}

function extractDesc($, section) {
  let desc = '';
  $(section).find('p, li, td').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 30 && t.length < 300) { desc = t.slice(0, 220); return false; }
  });
  return desc;
}

// ─────────────────────────────────────────────────────────────
// MAIN CHECK (same 4-step logic, now uses smartFetch)
// ─────────────────────────────────────────────────────────────

async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ══════════════════════════════`);
  console.log(`[checker] ${company.name}`);
  console.log(`[checker] URLs: ${urls.join(' | ')}`);

  let allLinks = [], bestTitle = '', bestDesc = '', fingerprint = '', foundContent = false;

  for (const url of urls) {
    console.log(`\n[checker] → ${url}`);

    const result = await smartFetch(url);   // ← upgraded fetch
    if (!result) { fingerprint += url + ':fetch-failed|'; continue; }
    const { $ } = result;

    // STEP 1: Full page empty check
    if (pageIsEmpty($)) {
      console.log(`[checker] ✗ STEP 1 — No vacancies`);
      fingerprint += url + ':page-empty|'; continue;
    }
    console.log(`[checker] ✓ STEP 1 — Page has content`);

    // STEP 2: Find openings section
    const section = findOpeningsSection($);
    if (!section || !section.length) {
      console.log(`[checker] ~ STEP 2 — No section, doc fallback`);
      const docs = collectDocumentLinks(null, url, $);
      if (docs.length > 0) {
        console.log(`[checker] ✓ ${docs.length} docs found`);
        docs.forEach(d => console.log(`   • ${d.label} → ${d.url}`));
        allLinks.push(...docs.filter(l => !allLinks.find(x => x.url === l.url)));
        foundContent = true;
        if (!bestTitle) bestTitle = `Recruitment at ${company.name}`;
        fingerprint += url + ':docs:' + docs.map(l => l.url).join(',') + '|';
      } else {
        // Last resort: page URL itself (content confirmed present by STEP 1)
        console.log(`[checker] ~ No docs — using page URL`);
        foundContent = true;
        if (!bestTitle) bestTitle = `New opportunity at ${company.name}`;
        allLinks.push({ url, label: 'View Opportunities' });
        fingerprint += url + ':page-url|';
      }
      continue;
    }
    console.log(`[checker] ✓ STEP 2 — Section found`);

    // STEP 3: Section has real content?
    if (!sectionHasRealContent($, section)) {
      console.log(`[checker] ~ STEP 3 — Section empty, doc fallback`);
      const sectionDocs = collectDocumentLinks(section, url, $);
      if (sectionDocs.length > 0) {
        console.log(`[checker] ✓ ${sectionDocs.length} docs in section`);
        sectionDocs.forEach(d => console.log(`   • ${d.label} → ${d.url}`));
        allLinks.push(...sectionDocs.filter(l => !allLinks.find(x => x.url === l.url)));
        foundContent = true;
        if (!bestTitle) { const t = extractTitle($, section); if (t) bestTitle = t; }
        fingerprint += url + ':section-docs:' + sectionDocs.map(l => l.url).join(',') + '|';
      } else {
        console.log(`[checker] ✗ STEP 3 — Truly empty`);
        fingerprint += url + ':section-empty|';
      }
      continue;
    }
    console.log(`[checker] ✓ STEP 3 — Real content`);

    // STEP 4: Extract links
    const sectionLinks = extractLinks($, section, url);
    const title = extractTitle($, section);
    const desc  = extractDesc($, section);

    console.log(`[checker] ✓ STEP 4 — ${sectionLinks.length} links`);
    sectionLinks.forEach(l => console.log(`   • ${l.label} → ${l.url}`));

    if (sectionLinks.length > 0) {
      foundContent = true;
      allLinks.push(...sectionLinks.filter(l => !allLinks.find(x => x.url === l.url)));
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      fingerprint += url + ':' + sectionLinks.map(l => l.url).join(',') + '|';
    } else {
      // Section has text but links are still dynamic — use page URL
      console.log(`[checker] ~ STEP 4 — No links, using page URL`);
      foundContent = true;
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      allLinks.push({ url, label: 'View Current Opportunities' });
      fingerprint += url + ':no-links|';
    }
  }

  const topLinks = allLinks.slice(0, 6);
  console.log(`\n[checker] RESULT: ${company.name} — links:${topLinks.length} content:${foundContent}`);

  if (!foundContent && !bestDesc) {
    console.log(`[checker] → SKIP\n`);
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

// ─────────────────────────────────────────────────────────────
// DAILY CHECK + EMAIL (unchanged)
// ─────────────────────────────────────────────────────────────

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

function pageSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const common = [...setA].filter(x => setB.has(x)).length;
  return common / Math.max(setA.size, setB.size, 1);
}

module.exports = { checkCompany, runDailyCheck };