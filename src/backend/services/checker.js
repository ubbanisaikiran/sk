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

const JOB_CONTEXT = [
  'vacancy', 'vacancies', 'recruitment', 'opening', 'post',
  'notification', 'advertisement', 'advt', 'circular',
  'apply', 'application', 'last date', 'closing date',
  'job title', 'qualification', 'experience',
  'registration', 'link for', 'due date', 'published',
  'click here for details', 'direct recruitment',
  'scheme', 'syllabus',
];

const JOB_LINK_TEXT = [
  'apply', 'apply now', 'apply online', 'register',
  'click here', 'click here for details',
  'notification', 'advertisement', 'advt',
  'details', 'view details', 'download',
  'scheme', 'syllabus', 'recruitment', 'vacancy',
  'know more', 'read more',
];

const JOB_URL_PATTERNS = [
  '.pdf', '.doc', '.docx',
  '/job', '/jobs', '/career', '/careers',
  '/vacancy', '/vacancies', '/recruit', '/recruitment',
  '/opening', '/openings', '/apply', '/application',
  '/notification', '/advertisement', '/circular', '/advt',
  'attachment', 'getfile', 'getcareer', 'download',
  'image/get', 'getattachment', 'filedownload',
  'ibps.in', 'ssc.nic.in', 'upsconline', 'nta.ac.in',
  'crpd', 'externalexam', 'ora.',
];

const SKIP_URLS = [
  'javascript:', 'mailto:', 'tel:',
  'facebook.com', 'twitter.com', 'youtube.com',
  'instagram.com', 'whatsapp.com',
  'play.google.com', 'apps.apple.com',
  'linkedin.com/company',
];

const NOISE_SELECTORS = [
  'script', 'style', 'noscript',
  'nav', 'header', 'footer',
  '[class*="navbar"]', '[class*="topbar"]', '[class*="sidenav"]',
  '[class*="accessibility"]', '[class*="toolbar"]', '[class*="breadcrumb"]',
  '[class*="social"]', '[class*="share"]', '[class*="cookie"]', '[class*="popup"]',
  '[id*="nav"]', '[id*="header"]', '[id*="footer"]', '[id*="sidebar"]',
];

// ─────────────────────────────────────────────────────────────
// SMART FETCH — axios first, Puppeteer fallback for JS sites
// ─────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function smartFetch(url) {
  // Layer 1: Fast axios
  try {
    const res  = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const $    = cheerio.load(html);
    removeNoise($);
    const len  = $('body').text().replace(/\s+/g, ' ').trim().length;
    if (len > 400) {
      console.log(`[fetch] axios OK (${len} chars)`);
      return $;
    }
    console.log(`[fetch] JS shell (${len} chars) — trying Puppeteer`);
  } catch (e) {
    console.warn(`[fetch] axios failed: ${e.message}`);
  }

  // Layer 2: Puppeteer for JS-rendered pages
  return puppeteerFetch(url);
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
      executablePath: execPath, args, headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));
    const html = await page.content();
    await browser.close(); browser = null;
    const $ = cheerio.load(html);
    removeNoise($);
    console.log(`[fetch] Puppeteer OK (${$('body').text().replace(/\s+/g,' ').trim().length} chars)`);
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
// WORKING 4-STEP HELPERS (preserved exactly)
// ─────────────────────────────────────────────────────────────

function pageIsEmpty($) {
  const text = $('body').text().toLowerCase().replace(/\s+/g, ' ');
  return EMPTY_SIGNALS.some(e => text.includes(e));
}

function findOpeningsSection($) {
  let bestEl = null, bestScore = 0;
  $('h1, h2, h3, h4, h5').each((_, el) => {
    const text  = $(el).text().toLowerCase().replace(/\s+/g, ' ');
    const score = OPENING_SECTION_TITLES.filter(t => text.includes(t)).length;
    if (score > bestScore) { bestScore = score; bestEl = el; }
  });
  $('section, article, div').each((_, el) => {
    const id  = ($(el).attr('id')    || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();
    const score = OPENING_SECTION_TITLES.filter(t => (id + ' ' + cls).includes(t)).length;
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
  const text = $(section).text().toLowerCase().replace(/\s+/g, ' ');
  if (EMPTY_SIGNALS.some(e => text.includes(e))) {
    console.log('[checker] ✗ Section has empty signal'); return false;
  }
  let emptyJobTable = false;
  $(section).find('table').each((_, table) => {
    const t   = $(table).text().toLowerCase();
    const isJob = ['vacancy','position','post','role','qualification','experience','job title','last date'].some(k => t.includes(k));
    if (isJob && $(table).find('tbody tr').length === 0) { emptyJobTable = true; return false; }
  });
  if (emptyJobTable) { console.log('[checker] ✗ Empty job table'); return false; }
  const links = $(section).find('a').length;
  const rows  = $(section).find('tbody tr, li').length;
  console.log(`[checker] Section — links:${links} rows:${rows} textLen:${text.length}`);
  return text.length > 60 && (links > 0 || rows > 0);
}

function findJobTable($, el) {
  let found = null;
  $(el).find('table').each((_, table) => {
    const h = $(table).find('thead, tr').first().text().toLowerCase();
    if (['download','notification','recruitment','vacancy','closing','publishing',
         'date','job title','last date','link for'].some(k => h.includes(k))) {
      found = table; return false;
    }
  });
  return found;
}

function isNavLink(fullUrl, pageUrl) {
  try {
    const link = new URL(fullUrl);
    const page = new URL(pageUrl);
    if (link.hostname !== page.hostname) return false;
    const lp = link.pathname.toLowerCase().replace(/\/$/, '');
    const pp = page.pathname.toLowerCase().replace(/\/$/, '');
    if (lp === pp) return false;
    const isDoc = lp.match(/\.(pdf|doc|docx)$/) ||
      ['attachment','download','getfile','getcareer','notification',
       'advertisement','advt','circular','image/get','getattachment'].some(p => lp.includes(p));
    if (isDoc) return false;
    const isJobPath = ['/job','/recruit','/vacancy','/opening','/apply',
                       '/notification','/advertisement'].some(p => lp.includes(p));
    if (isJobPath) return false;
    if (pp.startsWith(lp + '/')) return true;
    const parent = pp.split('/').slice(0, -1).join('/');
    if (lp.startsWith(parent + '/') && lp !== pp) return true;
    return false;
  } catch { return false; }
}

function hasJobContext($, el) {
  const ctx = $(el).closest('tr, li, div, p, td, article, [class*="card"]').first().text().toLowerCase();
  return JOB_CONTEXT.some(k => ctx.includes(k));
}

function extractFromSection($, section, pageUrl) {
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
        if (!links.find(l => l.url === fullUrl)) links.push({ url: fullUrl, label: text });
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
    if (!links.find(l => l.url === fullUrl)) links.push({ url: fullUrl, label: text });
  });
  return links;
}

function collectDocLinks($el, baseUrl, $) {
  const links = [];
  const DOC_URL  = ['.pdf','.doc','.docx','attachment','getfile','getdoc','getcareer',
                    'advt','advertisement','circular','careerattachment','image/get',
                    'getattachment','filedownload'];
  const DOC_TEXT = ['advertisement','notification','apply online','application form',
                    'advt','circular','recruitment','vacancy details',
                    'click here to apply','brochure','detailed'];
  let searchIn;
  if ($el) {
    const tbl = findJobTable($, $el);
    searchIn  = tbl ? $(tbl).find('tbody tr a') : $($el).find('a');
  } else {
    searchIn = $('a');
  }
  searchIn.each((_, el) => {
    const href    = $(el).attr('href') || '';
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();
    const text    = rawText.toLowerCase();
    if (!href || href === '#' || href.startsWith('#')) return;
    if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
    const isDocUrl  = DOC_URL.some(p => href.toLowerCase().includes(p));
    const isDocText = DOC_TEXT.some(t => text.includes(t));
    if (!isDocUrl && !isDocText) return;
    if (!hasJobContext($, el)) { console.log(`   [skip no-ctx] ${rawText}`); return; }
    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, baseUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;
    if (SKIP_URLS.some(p => fullUrl.toLowerCase().includes(p))) return;
    if (isNavLink(fullUrl, baseUrl)) return;
    if (!links.find(l => l.url === fullUrl)) links.push({ url: fullUrl, label: rawText || 'View Document' });
  });
  return links;
}

// ─────────────────────────────────────────────────────────────
// UNIVERSAL LINK SCORER — fallback for BSNL/MeitY/SEBI/BOB etc.
// ─────────────────────────────────────────────────────────────

function scoreLink(href, linkText, contextText) {
  let score = 0;
  const url  = href.toLowerCase();
  const text = linkText.toLowerCase().trim();
  const ctx  = contextText.toLowerCase();
  if (!href || href === '#' || href.startsWith('#')) return -1;
  if (['javascript:', 'mailto:', 'tel:'].some(p => href.startsWith(p))) return -1;
  if (text.length < 2) return -1;
  if (SKIP_URLS.some(p => url.includes(p))) return -1;
  // URL signals
  if (url.includes('.pdf'))                              score += 8;
  if (url.match(/\.(doc|docx)$/))                        score += 7;
  if (JOB_URL_PATTERNS.some(p => url.includes(p)))       score += 4;
  // Link text signals
  if (JOB_LINK_TEXT.some(t => text.includes(t)))         score += 4;
  if (text.includes('apply'))                             score += 3;
  if (text.includes('notification') || text.includes('advertisement')) score += 3;
  if (text.includes('vacancy') || text.includes('recruitment'))        score += 3;
  // Context signals
  const ctxHits = JOB_CONTEXT.filter(k => ctx.includes(k)).length;
  score += Math.min(ctxHits * 2, 10);
  // Date in context = strong signal
  if (ctx.match(/\d{2}[.\-/]\d{2}[.\-/]\d{4}/) || ctx.match(/\d{4}-\d{2}-\d{2}/)) score += 2;
  return score;
}

function universalScorer($, pageUrl) {
  const scored = [];
  $('a').each((_, el) => {
    const href    = ($(el).attr('href') || '').trim();
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();
    const context = $(el)
      .closest('tr, li, article, [class*="card"], div, section')
      .first().text().replace(/\s+/g, ' ').slice(0, 600);
    const score = scoreLink(href, rawText, context);
    if (score < 3) return;
    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, pageUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;
    if (isNavLink(fullUrl, pageUrl)) return;
    const existing = scored.find(l => l.url === fullUrl);
    if (existing) {
      if (score > existing.score) { existing.score = score; existing.label = rawText; }
    } else {
      scored.push({ url: fullUrl, label: rawText || 'View Details', score });
    }
  });
  scored.sort((a, b) => b.score - a.score);
  console.log(`[scorer] ${scored.length} links scored ≥3`);
  scored.slice(0, 6).forEach(l => console.log(`   [${l.score}] ${l.label} → ${l.url}`));
  return scored.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// TITLE & DESCRIPTION
// ─────────────────────────────────────────────────────────────

function extractTitle($, section) {
  const el = section ? $(section) : $('body');
  let title = '';
  el.find('h1,h2,h3,h4,h5').each((_, h) => {
    const t = $(h).text().trim();
    const l = t.toLowerCase();
    if (t.length > 5 && t.length < 150 &&
        ['job','career','vacanc','recruit','opportunit','opening'].some(k => l.includes(k))) {
      title = t; return false;
    }
  });
  if (!title && section) {
    const h = $(section).find('h1,h2,h3,h4,h5').first().text().trim();
    if (h.length > 5 && h.length < 150) title = h;
  }
  return title;
}

function extractDesc($, section) {
  const el = section ? $(section) : $('body');
  let desc = '';
  el.find('p, li, td').each((_, e) => {
    const t = $(e).text().replace(/\s+/g, ' ').trim();
    if (t.length > 40 && t.length < 400 &&
        JOB_CONTEXT.some(k => t.toLowerCase().includes(k))) {
      desc = t.slice(0, 220); return false;
    }
  });
  return desc;
}

// ─────────────────────────────────────────────────────────────
// MAIN CHECK — 4-step + universal scorer fallback
// ─────────────────────────────────────────────────────────────

async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ════════════════════════════`);
  console.log(`[checker] ${company.name}`);
  console.log(`[checker] URLs: ${urls.join(' | ')}`);

  let allLinks = [], bestTitle = '', bestDesc = '', fingerprint = '', foundContent = false;

  for (const url of urls) {
    console.log(`\n[checker] → ${url}`);

    const $ = await smartFetch(url);
    if (!$) { fingerprint += url + ':fetch-failed|'; continue; }

    // STEP 1: Full page empty check (catches Balmer Lawrie "no vacancies")
    if (pageIsEmpty($)) {
      console.log(`[checker] ✗ STEP 1 — No vacancies`);
      fingerprint += url + ':no-vacancy|';
      continue;
    }
    console.log(`[checker] ✓ STEP 1 — Page has content`);

    // STEP 2: Find named openings section (CEL "Career Opportunity", BOB "Current Opportunities")
    const section = findOpeningsSection($);

    if (section && section.length) {
      console.log(`[checker] ✓ STEP 2 — Named section found`);

      if (sectionHasRealContent($, section)) {
        console.log(`[checker] ✓ STEP 3 — Section has real content`);

        // STEP 4: Extract from job table or full section
        const sectionLinks = extractFromSection($, section, url);
        const title = extractTitle($, section);
        const desc  = extractDesc($, section);
        console.log(`[checker] ✓ STEP 4 — ${sectionLinks.length} links from section`);
        sectionLinks.forEach(l => console.log(`   • ${l.label} → ${l.url}`));

        if (sectionLinks.length > 0) {
          foundContent = true;
          sectionLinks.forEach(l => { if (!allLinks.find(x => x.url === l.url)) allLinks.push(l); });
          if (!bestTitle && title) bestTitle = title;
          if (!bestDesc  && desc)  bestDesc  = desc;
          fingerprint += url + ':section:' + sectionLinks.map(l => l.url).join(',') + '|';
          continue;
        }
        // Section has text but links are JS-rendered — fall through to scorer
        console.log(`[checker] ~ Section links empty — falling to scorer`);
        if (!bestTitle && title) bestTitle = title;
        if (!bestDesc  && desc)  bestDesc  = desc;

      } else {
        // Section found but empty — try doc links inside it
        const sectionDocs = collectDocLinks(section, url, $);
        if (sectionDocs.length > 0) {
          console.log(`[checker] ✓ STEP 3 doc fallback — ${sectionDocs.length} docs`);
          sectionDocs.forEach(d => console.log(`   • ${d.label} → ${d.url}`));
          foundContent = true;
          sectionDocs.forEach(l => { if (!allLinks.find(x => x.url === l.url)) allLinks.push(l); });
          if (!bestTitle) { const t = extractTitle($, section); if (t) bestTitle = t; }
          fingerprint += url + ':section-docs:' + sectionDocs.map(l => l.url).join(',') + '|';
          continue;
        }
        console.log(`[checker] ~ Section empty — falling to scorer`);
      }

    } else {
      // No named section — try doc/PDF links first
      const docs = collectDocLinks(null, url, $);
      if (docs.length > 0) {
        console.log(`[checker] ~ STEP 2 doc fallback — ${docs.length} docs`);
        docs.forEach(d => console.log(`   • ${d.label} → ${d.url}`));
        foundContent = true;
        docs.forEach(l => { if (!allLinks.find(x => x.url === l.url)) allLinks.push(l); });
        if (!bestTitle) bestTitle = `Recruitment at ${company.name}`;
        fingerprint += url + ':docs:' + docs.map(l => l.url).join(',') + '|';
        continue;
      }
      console.log(`[checker] ~ No section, no docs — falling to scorer`);
    }

    // UNIVERSAL SCORER FALLBACK
    // Handles: BSNL table, MeitY cards, BOB JS-rendered, SEBI portal, any modern site
    const scored = universalScorer($, url);
    const title  = extractTitle($, null);
    const desc   = extractDesc($, null);

    if (scored.length > 0) {
      console.log(`[checker] ✓ Scorer — ${scored.length} job links`);
      foundContent = true;
      scored.forEach(l => { if (!allLinks.find(x => x.url === l.url)) allLinks.push({ url: l.url, label: l.label }); });
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      fingerprint += url + ':scored:' + scored.map(l => l.url).join(',') + '|';
    } else {
      // Absolute last resort — page confirmed has content (passed STEP 1)
      console.log(`[checker] ~ Last resort — using page URL`);
      foundContent = true;
      if (!bestTitle) bestTitle = title || `Opportunities at ${company.name}`;
      if (!bestDesc  && desc)  bestDesc = desc;
      allLinks.push({ url, label: 'View Opportunities' });
      fingerprint += url + ':page-url|';
    }
  }

  const topLinks = allLinks.slice(0, 6);
  console.log(`\n[checker] RESULT: ${company.name} — ${topLinks.length} links, content: ${foundContent}`);

  if (!foundContent) {
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
    console.log(`[checker] ✓ Update: "${newUpdate.title}"`);
  } else {
    console.log(`[checker] ~ No change`);
  }

  company.lastContent = currentContent;
  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ─────────────────────────────────────────────────────────────
// DAILY CHECK — sequential to avoid Puppeteer memory issues
// ─────────────────────────────────────────────────────────────

async function runDailyCheck() {
  const users = await User.find({}).lean();
  console.log(`[checker] Daily run — ${users.length} user(s)`);

  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;

      for (const c of companies) {
        try { await checkCompany(c); }
        catch (e) { console.error(`[checker] ${c.name} error:`, e.message); }
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
// EMAIL DIGEST (unchanged)
// ─────────────────────────────────────────────────────────────

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
                return `<a href="${link}" target="_blank"
                  style="display:inline-block;margin:4px 4px 0 0;padding:8px 16px;
                  background:#ede9fe;color:#6366f1;border-radius:6px;
                  font-size:12px;font-weight:700;text-decoration:none">
                  ${isPdf ? '📄' : '🔗'} ${label}</a>`;
              }).join('')
            : u.applyLink
              ? `<a href="${u.applyLink}" target="_blank"
                  style="display:inline-block;padding:8px 20px;background:#6366f1;
                  color:#fff;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none">
                  View Openings →</a>`
              : ''
          }
        </div>`).join('')
    : `<p style="color:#9ca3af;text-align:center;padding:32px">No new updates today.</p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:22px">⚡ SK Career Upstep</h1>
        <p style="margin:8px 0 0;opacity:0.8;font-size:13px">
          ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Monitoring <strong>${companies.length}</strong> compan${companies.length===1?'y':'ies'}.</p>
        <h2 style="font-size:16px;border-bottom:2px solid #6366f1;padding-bottom:8px">
          ${updates.length ? `🔔 ${updates.length} New Update(s)` : `📋 Today's Summary`}
        </h2>
        ${updatesHtml}
        <div style="text-align:center;margin-top:24px">
          <a href="${process.env.FRONTEND_URL||'http://localhost:3000'}"
             style="display:inline-block;padding:13px 36px;background:#6366f1;
             color:#fff;border-radius:8px;font-weight:800;text-decoration:none">
            Login & Apply →
          </a>
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