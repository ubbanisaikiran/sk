/**
 * SK Career Upstep — Universal Scraper
 *
 * Covers all Indian PSU / Bank / Cooperative career portals:
 *
 * TYPE A  ASP.NET / Static HTML tables (.aspx, .asp, .html)
 * BPCL, RBI, NABARD, PNB, BEL, CONCOR, IRCTC, KRIBHCO
 * → axios fetch → job table detection → extract tbody rows
 *
 * TYPE B  Govt NIC-style, PDF-heavy
 * ONGC, OIL, ISRO, DRDO, BARC, CSIR, NIC, IOCL, HPCL, Coal India
 * → axios fetch → PDF/doc link with job context
 *
 * TYPE C  Corporate CMS (Drupal/WordPress/custom)
 * HAL, POWERGRID, PFC, REC, EIL, NMDC, NBCC, RVNL,
 * IREDA, NALCO, SIDBI, IFFCO, NAFED, GAIL
 * → axios fetch → named section → extract links
 *
 * TYPE D  JS-rendered / React / Angular / ATS portals
 * BHEL careers.bhel.in, NTPC careers.ntpc.co.in,
 * SAIL sailcareers.com, Amul careers.amul.com,
 * SEBI, SBI, IBPS, BOB, Canara, Union Bank
 * → Puppeteer → scored link extraction
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ─────────────────────────────────────────────────────────────
// CONSTANTS — tuned for Indian govt/PSU sites
// ─────────────────────────────────────────────────────────────

/**
 * Heading / ID / class text that indicates a "jobs" section.
 * Sorted roughly by specificity — more specific first.
 */
const SECTION_KEYWORDS = [
  // Specific
  'current opening', 'current opportunit', 'current vacanc',
  'latest opening', 'latest vacanc', 'new opening', 'active opening',
  'open position', 'available position', 'job opportunit',
  'career opportunit', 'employment opportunit',
  'recruitment notification', 'ongoing recruitment',
  'job listing', 'job opening', 'open role',
  // General (common on PSU sites)
  'vacancy', 'vacancies', 'recruitment', 'advertisement', 'notification',
  'careers at', 'jobs at', 'work with us', 'join us', 'join our team',
  // Hindi (NIC/govt sites)
  'वर्तमान रिक्तियां', 'भर्ती', 'रिक्ति', 'रोजगार',
];

/**
 * Text signals meaning "zero openings right now".
 * If ANY appears in full page body → skip the URL entirely.
 */
const EMPTY_SIGNALS = [
  'no vacancies', 'no current openings', 'no openings',
  'currently there are no', 'no posts available',
  'no positions available', 'check back later',
  'no active recruitment', 'no job openings',
  'no current vacancies', 'kindly check back later',
  'no open positions', 'no open roles', 'no jobs found',
  'no results found', 'no recruitment currently',
  'at present no vacancy', 'no data available',
  'no current opportunities', 'no advertisement',
  'presently no vacancy', 'no notification available',
  'कोई रिक्तियां नहीं', 'कोई पद नहीं', 'वर्तमान में कोई',
];

/**
 * Words in the surrounding text of a link that confirm it's job-related.
 * Used by the context-check and scorer.
 */
const JOB_CONTEXT = [
  'vacancy', 'vacancies', 'recruitment', 'opening', 'post',
  'notification', 'advertisement', 'advt', 'circular',
  'apply', 'application', 'last date', 'closing date',
  'job title', 'qualification', 'experience', 'eligibility',
  'registration', 'link for', 'due date', 'published date',
  'click here for details', 'direct recruitment',
  'scheme', 'syllabus', 'walk-in', 'interview',
  'deputation', 'contract', 'temporary', 'permanent',
  'grade', 'pay scale', 'emoluments', 'stipend',
  'advt no', 'advertisement no', 'ref no',
];

/**
 * Link text values that strongly signal a job link.
 */
const JOB_LINK_TEXT = [
  'apply', 'apply now', 'apply online', 'register', 'registration link',
  'click here', 'click here for details', 'click here for scheme',
  'notification', 'advertisement', 'advt', 'official notification',
  'view details', 'view notification', 'download notification',
  'scheme and syllabus', 'syllabus', 'download', 'download here',
  'recruitment', 'vacancy', 'job details', 'more details',
  'know more', 'read more', 'view more', 'view opening',
  'official website', 'online application',
];

/**
 * URL path fragments confirming a link leads to a job/doc.
 */
const JOB_URL_PATTERNS = [
  '.pdf', '.doc', '.docx',
  '/job', '/jobs', '/career', '/careers',
  '/vacancy', '/vacancies', '/recruit', '/recruitment',
  '/opening', '/openings', '/apply', '/application',
  '/notification', '/advertisement', '/circular', '/advt',
  '/notice', '/press-release', '/announcement',
  // File-download patterns (CEL, BARC, ONGC style)
  'attachment', 'getfile', 'getdoc', 'getcareer', 'download',
  'image/get', 'getattachment', 'filedownload',
  'uploadedfiles', 'writereaddata', 'sites/default/files',
  '/uploads/', '/media/', '/documents/',
  // Known Indian job portals
  'ibps.in', 'ssc.nic.in', 'upsconline.nic.in', 'nta.ac.in',
  'crpd.sbi', 'bankbarodacrpd', 'externalexam', 'ora.',
  'careerportal', 'jobportal', 'recruitment-portal',
  'sarkarresult', 'rojgarresult',
];

/** Header keywords that identify a job/vacancy table. */
const TABLE_HEADER_KEYWORDS = [
  'download', 'notification', 'recruitment', 'vacancy', 'vacancies',
  'closing', 'last date', 'link for', 'date of', 'due date',
  'job title', 'post', 'position', 'registration', 'apply',
  'advt', 'advertisement', 'sr.', 's.no', 'serial no',
  'ref', 'category', 'published',
  'title', 'description', 'file', 'document', 'issue date', 'name of'
];

/** Always skip these regardless of context. */
const HARD_SKIP = [
  'javascript:', 'mailto:', 'tel:', '#',
  'facebook.com', 'twitter.com', 'x.com', 'youtube.com',
  'instagram.com', 'whatsapp.com', 'linkedin.com/company',
  'play.google.com', 'apps.apple.com',
];

/** HTML elements to strip before processing. */
const NOISE = [
  'script', 'style', 'noscript', 'iframe',
  'nav', 'header', 'footer',
  '[class*="navbar"]', '[class*="topbar"]', '[class*="sidenav"]',
  '[class*="megamenu"]', '[class*="dropdown-menu"]',
  '[class*="accessibility"]', '[class*="toolbar"]', '[class*="breadcrumb"]',
  '[class*="social"]', '[class*="share"]', '[class*="cookie"]',
  '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
  '[class*="chatbot"]', '[class*="livechat"]',
  '[id*="nav"]', '[id*="header"]', '[id*="footer"]',
  '[id*="sidebar"]', '[id*="chat"]', '[id*="cookie"]',
];

// ─────────────────────────────────────────────────────────────
// SMART FETCH  —  axios first, Puppeteer fallback
// ─────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a URL and return a cleaned Cheerio instance.
 * Uses axios for static/SSR pages (TYPE A, B, C).
 * Falls back to Puppeteer for JS-rendered pages (TYPE D).
 */
async function smartFetch(url) {
  // ── Layer 1: Axios ────────────────────────────────────────
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':      UA,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
        'Cache-Control':   'no-cache',
      },
      maxRedirects: 5,
    });

    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const $    = cheerio.load(html);
    strip($);

    const len = $('body').text().replace(/\s+/g, ' ').trim().length;
    if (len > 400) {
      console.log(`[fetch] axios  ✓ ${len} chars — ${url}`);
      return $;
    }
    console.log(`[fetch] JS shell (${len} chars) → Puppeteer`);
  } catch (e) {
    console.warn(`[fetch] axios ✗ ${e.message}`);
  }

  // ── Layer 2: Puppeteer ────────────────────────────────────
  return puppeteerFetch(url);
}

async function puppeteerFetch(url) {
  let browser;
  try {
    let puppeteer, execPath, args;

    try {                                               // Railway production
      const chromium = require('@sparticuz/chromium');
      puppeteer  = require('puppeteer-core');
      execPath   = await chromium.executablePath();
      args       = chromium.args;
    } catch {                                           // Local dev
      puppeteer  = require('puppeteer');
      execPath   = undefined;
      args       = ['--no-sandbox', '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', '--disable-gpu'];
    }

    browser = await puppeteer.launch({
      executablePath: execPath, args, headless: true,
      defaultViewport: { width: 1440, height: 900 },
    });

    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Block heavy resources to speed up load
    await page.setRequestInterception(true);
    page.on('request', req => {
      ['image', 'font', 'media', 'manifest'].includes(req.resourceType())
        ? req.abort()
        : req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));          // React/Angular hydration
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));          // lazy-load trigger

    const html = await page.content();
    await browser.close(); browser = null;

    const $ = cheerio.load(html);
    strip($);
    console.log(`[fetch] puppeteer ✓ ${$('body').text().replace(/\s+/g,' ').trim().length} chars — ${url}`);
    return $;
  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    console.warn(`[fetch] puppeteer ✗ ${e.message}`);
    return null;
  }
}

/** Remove noise elements from the loaded page. */
function strip($) {
  NOISE.forEach(sel => { try { $(sel).remove(); } catch {} });
}

// ─────────────────────────────────────────────────────────────
// URL UTILITIES
// ─────────────────────────────────────────────────────────────

function resolve(href, base) {
  if (!href) return null;
  href = href.trim();
  if (!href || href === '#' || href.startsWith('#')) return null;
  if (HARD_SKIP.some(p => href.toLowerCase().startsWith(p))) return null;
  if (href.startsWith('http')) return href;
  try { return new URL(href, base).href; } catch { return null; }
}

/**
 * Returns true if the link is a same-domain navigation page
 * (parent or sibling) rather than a job/doc link.
 * e.g. /career when page is /career/current-openings → nav
 * /career/final-results when page is /career/current-openings → nav
 */
function isNavLink(fullUrl, pageUrl) {
  try {
    const L = new URL(fullUrl);
    const P = new URL(pageUrl);
    if (L.hostname !== P.hostname) return false;      // cross-domain → allow

    const lp = L.pathname.toLowerCase().replace(/\/$/, '');
    const pp = P.pathname.toLowerCase().replace(/\/$/, '');
    if (lp === pp) return false;                       // same page → allow

    // If looks like a doc/job path → always allow through
    const isJobOrDoc =
      lp.match(/\.(pdf|doc|docx)$/) ||
      JOB_URL_PATTERNS.some(p => lp.includes(p));
    if (isJobOrDoc) return false;

    // Block parent path: /career blocking when on /career/current-openings
    if (pp.startsWith(lp + '/')) return true;

    // Block sibling path: /career/results when on /career/current-openings
    const parent = pp.split('/').slice(0, -1).join('/');
    if (parent && lp.startsWith(parent + '/') && lp !== pp) return true;

    return false;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────
// SECTION FINDER
// Finds the "Current Openings / Vacancies" section of the page.
// Works well for TYPE A, B, C sites.
// ─────────────────────────────────────────────────────────────

function findSection($) {
  let bestEl = null, bestScore = 0;

  // 1. Score all headings
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const t = $(el).text().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    const s = SECTION_KEYWORDS.filter(k => t.includes(k)).length;
    if (s > bestScore) { bestScore = s; bestEl = el; }
  });

  // 2. Score section/div id+class attributes
  $('section,article,div,ul,table').each((_, el) => {
    const id  = ($(el).attr('id')    || '').toLowerCase().replace(/[-_]/g, ' ');
    const cls = ($(el).attr('class') || '').toLowerCase().replace(/[-_]/g, ' ');
    const s   = SECTION_KEYWORDS.filter(k => (id + ' ' + cls).includes(k)).length;
    if (s > bestScore) { bestScore = s; bestEl = el; }
  });

  if (!bestEl || bestScore === 0) return null;

  const tag = (bestEl.tagName || '').toLowerCase();
  if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
    // Climb to the nearest meaningful content wrapper
    const wrapper = $(bestEl).closest(
      'section, article, [class*="career"], [class*="job"], [class*="opening"],' +
      '[class*="opportunit"], [class*="vacancy"], [class*="recruit"],' +
      '[class*="content"], [class*="main"], [class*="wrap"]'
    );
    return wrapper.length ? wrapper : $(bestEl).parent();
  }
  return $(bestEl);
}

// ─────────────────────────────────────────────────────────────
// JOB TABLE FINDER
// Detects structured vacancy tables by header keyword count.
// ─────────────────────────────────────────────────────────────

function findTable($, scope) {
  let best = null, bestCount = 0;

  const root = scope ? $(scope) : $('body');
  root.find('table').each((_, tbl) => {
    const header = $(tbl).find('thead tr, tr').first().text().toLowerCase();
    const count  = TABLE_HEADER_KEYWORDS.filter(k => header.includes(k)).length;
    // Need at least 2 matching header keywords to qualify as a job table
    if (count >= 2 && count > bestCount) {
      const dataRows = $(tbl).find('tbody tr').length || $(tbl).find('tr').length - 1;
      if (dataRows > 0) { bestCount = count; best = tbl; }
    }
  });

  return best;
}

// ─────────────────────────────────────────────────────────────
// LINK EXTRACTORS
// ─────────────────────────────────────────────────────────────

/** Extract job links from table data rows only (skip header). */
function linksFromTable($, table, pageUrl) {
  const out = [];
  // Try tbody rows first; fall back to all rows except first
  const rows = $(table).find('tbody tr').length
    ? $(table).find('tbody tr')
    : $(table).find('tr').slice(1);

  rows.each((_, row) => {
    $(row).find('a').each((_, a) => {
      const href = ($(a).attr('href') || '').trim();
      const text = $(a).text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2) return;
      const url = resolve(href, pageUrl);
      if (!url) return;
      if (HARD_SKIP.some(p => url.toLowerCase().includes(p))) return;
      if (isNavLink(url, pageUrl)) return;
      if (!out.find(l => l.url === url)) out.push({ url, label: text });
    });
  });
  return out;
}

/** Extract all links from a section (when no table is present). */
function linksFromSection($, section, pageUrl) {
  const out = [];
  $(section).find('a').each((_, a) => {
    const href = ($(a).attr('href') || '').trim();
    const text = $(a).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 2) return;
    const url = resolve(href, pageUrl);
    if (!url) return;
    if (HARD_SKIP.some(p => url.toLowerCase().includes(p))) return;
    if (isNavLink(url, pageUrl)) return;
    if (!out.find(l => l.url === url)) out.push({ url, label: text });
  });
  return out;
}

/**
 * Extract doc/PDF links with job-context validation.
 * TYPE B specialization: ONGC, OIL, ISRO, DRDO, BARC, CSIR, NIC, IOCL.
 */
function linksFromDocs($, scope, pageUrl) {
  const out = [];

  const DOC_URL = [
    '.pdf', '.doc', '.docx',
    'attachment', 'getfile', 'getdoc', 'getcareer', 'download',
    'advt', 'circular', 'notification', 'advertisement',
    'careerattachment', 'image/get', 'getattachment', 'filedownload',
    'uploadedfiles', 'writereaddata', 'sites/default/files',
    '/uploads/', '/media/', '/documents/',
  ];

  const DOC_TEXT = [
    'advertisement', 'notification', 'apply online', 'application form',
    'advt', 'circular', 'recruitment', 'vacancy details',
    'click here to apply', 'brochure', 'official notification',
    'download', 'view', 'details', 'click here',
  ];

  // If a job table exists inside scope, only look there to avoid noise
  const root  = scope ? $(scope) : $('body');
  const table = findTable($, scope);
  const pool  = table
    ? $(table).find('tbody tr a, tr:not(:first-child) a')
    : root.find('a');

  pool.each((_, a) => {
    const href    = ($(a).attr('href') || '').trim();
    const rawText = $(a).text().replace(/\s+/g, ' ').trim();
    const textLow = rawText.toLowerCase();

    if (!href || HARD_SKIP.some(p => href.toLowerCase().startsWith(p))) return;

    const isDocUrl  = DOC_URL.some(p => href.toLowerCase().includes(p));
    const isDocText = DOC_TEXT.some(t => textLow.includes(t));
    if (!isDocUrl && !isDocText) return;

    // Verify job context in the surrounding element
    const ctx = $(a).closest('tr,li,div,p,td,article').first().text().toLowerCase();
    if (!JOB_CONTEXT.some(k => ctx.includes(k))) return;

    const url = resolve(href, pageUrl);
    if (!url) return;
    if (HARD_SKIP.some(p => url.toLowerCase().includes(p))) return;
    if (isNavLink(url, pageUrl)) return;
    if (!out.find(l => l.url === url)) out.push({ url, label: rawText || 'Document' });
  });

  return out;
}

// ─────────────────────────────────────────────────────────────
// UNIVERSAL LINK SCORER
// Fallback for TYPE D (BHEL, NTPC, SAIL, Amul, BOB, SEBI, IBPS…).
// Scores every <a> on the page; returns top results above threshold.
// ─────────────────────────────────────────────────────────────

function score(href, linkText, ctx) {
  const url  = (href      || '').toLowerCase();
  const text = (linkText  || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const c    = (ctx       || '').toLowerCase();

  if (HARD_SKIP.some(p => url.startsWith(p))) return -1;
  if (text.length < 2) return -1;

  let s = 0;

  // URL patterns
  if (url.includes('.pdf'))                              s += 8;
  if (url.match(/\.(doc|docx)$/))                        s += 7;
  if (JOB_URL_PATTERNS.some(p => url.includes(p)))       s += 4;

  // Link text
  if (JOB_LINK_TEXT.some(t => text.includes(t)))         s += 4;
  if (text.includes('apply'))                             s += 3;
  if (text.includes('notification') || text.includes('advt')) s += 3;
  if (text.includes('vacancy') || text.includes('recruitment')) s += 3;
  if (text.includes('download') || text.includes('scheme'))    s += 2;

  // Surrounding context keyword density
  const hits = JOB_CONTEXT.filter(k => c.includes(k)).length;
  s += Math.min(hits * 2, 12);

  // Date in context → very strong job signal
  if (/\d{2}[.\-/]\d{2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2}/.test(c)) s += 3;

  // Table row serial number indicator
  if (/\bsr\.?\s*no|\bs\.?\s*no\b|serial\s*no/.test(c))          s += 2;

  return s;
}

function universalScorer($, pageUrl) {
  const bucket = [];

  $('a').each((_, a) => {
    const href = ($(a).attr('href') || '').trim();
    const text = $(a).text().replace(/\s+/g, ' ').trim();

    // Context: nearest meaningful ancestor up to 700 chars
    const ctx = $(a)
      .closest('tr,li,article,[class*="card"],[class*="item"],[class*="post"],[class*="views-row"],[class*="list-row"]')
      .first().text().replace(/\s+/g, ' ').trim().slice(0, 700);

    const s = score(href, text, ctx);
    if (s < 3) return;                                 // below threshold

    const url = resolve(href, pageUrl);
    if (!url) return;
    if (HARD_SKIP.some(p => url.toLowerCase().includes(p))) return;
    if (isNavLink(url, pageUrl)) return;

    // LABEL ENRICHMENT: Steal context if the link text is too short/generic
    let finalLabel = text || 'View Details';
    if (finalLabel.length < 15 && $(a).closest('tr').length) {
      const rowTitle = $(a).closest('tr').find('td, th').first().text().replace(/\s+/g, ' ').trim();
      if (rowTitle && rowTitle.length > 5 && rowTitle !== finalLabel) {
        finalLabel = rowTitle.slice(0, 100) + ' (' + text + ')';
      }
    }

    const existing = bucket.find(l => l.url === url);
    if (existing) {
      if (s > existing.score) { existing.score = s; existing.label = finalLabel; }
    } else {
      bucket.push({ url, label: finalLabel, score: s });
    }
  });

  bucket.sort((a, b) => b.score - a.score);
  console.log(`[scorer] ${bucket.length} links scored ≥3`);
  bucket.slice(0, 6).forEach(l => console.log(`   [${l.score}] "${l.label}" → ${l.url}`));
  return bucket.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// METADATA HELPERS
// ─────────────────────────────────────────────────────────────

function getTitle($, scope) {
  const root = scope ? $(scope) : $('body');
  const JOB_WORDS = ['job','career','vacanc','recruit','opportunit','opening','hiring'];
  let t = '';
  root.find('h1,h2,h3,h4,h5').each((_, h) => {
    const text = $(h).text().trim();
    if (text.length > 5 && text.length < 200 &&
        JOB_WORDS.some(w => text.toLowerCase().includes(w))) {
      t = text; return false;
    }
  });
  // Fallback: first heading regardless
  if (!t) {
    const h = root.find('h1,h2,h3').first().text().trim();
    if (h.length > 5 && h.length < 200) t = h;
  }
  return t;
}

function getDesc($, scope) {
  const root = scope ? $(scope) : $('body');
  let d = '';
  root.find('p,li,td').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 40 && t.length < 500 &&
        JOB_CONTEXT.some(k => t.toLowerCase().includes(k))) {
      d = t.slice(0, 250); return false;
    }
  });
  return d;
}

// ─────────────────────────────────────────────────────────────
// MAIN CHECK FUNCTION
// Cascading strategy: table → section → docs → scorer → page URL
// ─────────────────────────────────────────────────────────────

async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ══ ${company.name} ══`);
  console.log(`[checker] ${urls.join(' | ')}`);

  let allLinks     = [];
  let bestTitle    = '';
  let bestDesc     = '';
  let fingerprint  = '';
  let foundContent = false;

  for (const url of urls) {
    console.log(`\n[checker] ─ ${url}`);

    const $ = await smartFetch(url);
    if (!$) {
      fingerprint += `${url}:fetch-failed|`;
      continue;
    }

    // ──────────────────────────────────────────────────────
    // GUARD: If page explicitly says "no vacancies" → skip
    // ──────────────────────────────────────────────────────
    const bodyText = $('body').text().toLowerCase().replace(/\s+/g, ' ');
    if (EMPTY_SIGNALS.some(e => bodyText.includes(e))) {
      console.log(`[checker] ✗ No vacancies signal found`);
      fingerprint += `${url}:no-vacancy|`;
      continue;
    }
    console.log(`[checker] ✓ Page has content`);

    let links = [], title = '', desc = '', method = '';

    // ══════════════════════════════════════════════════════
    // STRATEGY 1: Job table on the page (TYPE A, B)
    // Best for: BPCL, RBI, NABARD, BEL, CONCOR, ISRO, DRDO
    //           IOCL, HPCL, BSNL, CEL
    // ══════════════════════════════════════════════════════
    const pageTable = findTable($, null);
    if (pageTable) {
      const tLinks = linksFromTable($, pageTable, url);
      if (tLinks.length > 0) {
        links  = tLinks;
        title  = getTitle($, null);
        desc   = getDesc($, null);
        method = 'table';
        console.log(`[S1-table] ${links.length} links`);
        links.forEach(l => console.log(`   • "${l.label}" → ${l.url}`));
      }
    }

    // ══════════════════════════════════════════════════════
    // STRATEGY 2: Named section → table inside → all links
    // Best for: BOB, CEL, HAL, POWERGRID, PFC, IREDA (TYPE C)
    // ══════════════════════════════════════════════════════
    if (!links.length) {
      const section = findSection($);
      if (section && section.length) {
        const secText  = $(section).text().toLowerCase().replace(/\s+/g, ' ');
        const secEmpty = EMPTY_SIGNALS.some(e => secText.includes(e));

        if (!secEmpty) {
          // Try table inside section first
          const secTable = findTable($, section);
          if (secTable) {
            const tLinks = linksFromTable($, secTable, url);
            if (tLinks.length > 0) {
              links  = tLinks;
              title  = getTitle($, section);
              desc   = getDesc($, section);
              method = 'section-table';
              console.log(`[S2-section-table] ${links.length} links`);
              links.forEach(l => console.log(`   • "${l.label}" → ${l.url}`));
            }
          }

          // Fallback: all links in section
          if (!links.length) {
            const sLinks = linksFromSection($, section, url);
            if (sLinks.length > 0) {
              links  = sLinks;
              title  = getTitle($, section);
              desc   = getDesc($, section);
              method = 'section';
              console.log(`[S2-section] ${links.length} links`);
              links.forEach(l => console.log(`   • "${l.label}" → ${l.url}`));
            } else if (secText.length > 100) {
              // Section has text content but links are JS-rendered
              title  = getTitle($, section);
              desc   = getDesc($, section);
              method = 'section-text-only';
              console.log(`[S2-section] text only, no extractable links`);
            }
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // STRATEGY 3: Doc/PDF links with job context (TYPE B)
    // Best for: ONGC, OIL, ISRO, DRDO, BARC, CSIR, NIC
    //           RVNL, Coal India
    // ══════════════════════════════════════════════════════
    if (!links.length) {
      const dLinks = linksFromDocs($, null, url);
      if (dLinks.length > 0) {
        links  = dLinks;
        title  = getTitle($, null);
        desc   = getDesc($, null);
        method = 'docs';
        console.log(`[S3-docs] ${links.length} links`);
        links.forEach(l => console.log(`   • "${l.label}" → ${l.url}`));
      }
    }

    // ══════════════════════════════════════════════════════
    // STRATEGY 4: Universal link scorer (TYPE D)
    // Best for: BHEL portal, NTPC portal, SAIL portal,
    //           Amul careers, SEBI, SBI, IBPS, BOB JS,
    //           Canara, Union Bank, MeitY cards, IFFCO
    // ══════════════════════════════════════════════════════
    if (!links.length) {
      const scored = universalScorer($, url);
      if (scored.length > 0) {
        links  = scored.map(l => ({ url: l.url, label: l.label }));
        title  = getTitle($, null);
        desc   = getDesc($, null);
        method = 'scorer';
        console.log(`[S4-scorer] ${links.length} links`);
      }
    }

    // ══════════════════════════════════════════════════════
    // LAST RESORT: Return the page URL itself
    // Page has confirmed content (passed empty guard).
    // Ensures the user at minimum gets a "visit this page" link.
    // ══════════════════════════════════════════════════════
    if (!links.length) {
      links  = [{ url, label: 'View Current Opportunities' }];
      title  = getTitle($, null) || `Opportunities at ${company.name}`;
      desc   = getDesc($, null);
      method = 'page-url';
      console.log(`[S5-page-url] returning page URL`);
    }

    // Accumulate results
    foundContent = true;
    links.forEach(l => { if (!allLinks.find(x => x.url === l.url)) allLinks.push(l); });
    if (!bestTitle && title) bestTitle = title;
    if (!bestDesc  && desc)  bestDesc  = desc;
    fingerprint += `${url}:${method}:${links.map(l => l.url).join(',')}|`;

    console.log(`[checker] Method: ${method} | Links: ${links.length}`);
  }

  // ──────────────────────────────────────────────────────────
  // SAVE / COMPARE
  // ──────────────────────────────────────────────────────────

  const topLinks = allLinks.slice(0, 6);
  console.log(`\n[checker] ─ RESULT: ${company.name} | ${topLinks.length} links | content:${foundContent}`);
  topLinks.forEach(l => console.log(`   → "${l.label}" : ${l.url}`));

  if (!foundContent) {
    console.log(`[checker] SKIP — nothing found\n`);
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
    console.log(`[checker] ✓ Update saved: "${newUpdate.title}"`);
  } else {
    console.log(`[checker] ~ No change`);
  }

  company.lastContent = currentContent;
  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ─────────────────────────────────────────────────────────────
// DAILY CHECK — sequential to be memory-safe with Puppeteer
// ─────────────────────────────────────────────────────────────

async function runDailyCheck() {
  const users = await User.find({}).lean();
  const ts    = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n[checker] ══════ DAILY RUN ${ts} ══════`);
  console.log(`[checker] ${users.length} user(s)`);

  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;

      console.log(`\n[checker] User: ${user.email} — ${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'}`);

      for (const c of companies) {
        try { await checkCompany(c); }
        catch (e) { console.error(`[checker] ${c.name} error:`, e.message); }
      }

      const fresh  = await Company.find({ userId: user._id });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const todayUpdates = [];

      for (const c of fresh) {
        for (const u of c.updates) {
          if (new Date(u.detectedAt).getTime() >= cutoff) {
            todayUpdates.push({
              ...u.toObject(),
              company: c.name, companyId: c._id, type: c.type,
            });
          }
        }
      }

      console.log(`[checker] Sending digest → ${user.email} (${todayUpdates.length} updates)`);
      await sendDigest(user, fresh, todayUpdates);

    } catch (err) {
      console.error(`[checker] Fatal for ${user.email}:`, err.message);
    }
  }

  console.log(`\n[checker] ══════ DAILY RUN COMPLETE ══════\n`);
}

// ─────────────────────────────────────────────────────────────
// EMAIL DIGEST
// ─────────────────────────────────────────────────────────────

async function sendDigest(user, companies, updates) {
  const subject = updates.length
    ? `⚡ ${updates.length} new update${updates.length !== 1 ? 's' : ''} from your watchlist — SK Career`
    : `📋 Daily digest: ${companies.length} org${companies.length !== 1 ? 's' : ''} checked — SK Career`;

  const updatesHtml = updates.length
      ? updates.map(u => {
          const links = u.applyLinks && u.applyLinks.length > 1
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
                  style="display:inline-block;padding:9px 22px;background:#6366f1;
                         color:#fff;border-radius:7px;font-size:13px;
                         font-weight:700;text-decoration:none">
                  View Openings →</a>`
              : '';
          return `
    <div style="margin-bottom:16px;padding:20px;border:1px solid #e5e7eb;
                border-radius:10px;background:#fafafa">
      <div style="color:#6366f1;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
        ${u.company}
      </div>
      <h3 style="margin:0 0 8px;font-size:15px;color:#111;font-weight:700">
        ${u.title}
      </h3>
      <p style="color:#6b7280;font-size:13px;margin:0 0 14px;line-height:1.6">
        ${u.description}
      </p>
      <div>
        ${links}
      </div>
    </div>`;
        }).join('')
    : `<div style="text-align:center;padding:40px 0;color:#9ca3af">
         <div style="font-size:32px;margin-bottom:12px">👀</div>
         <p style="margin:0;font-size:14px">No new updates today. Watching for you!</p>
       </div>`;

  const html = `<!DOCTYPE html><html><body
    style="margin:0;padding:20px;background:#f3f4f6;
           font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                  padding:36px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px;color:#fff;font-weight:800">
          ⚡ SK Career Upstep
        </h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,.8);font-size:13px">
          ${new Date().toLocaleDateString('en-IN',
            { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;
                  border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 6px;color:#374151;font-size:15px">
          Hi <strong>${user.name}</strong>,
        </p>
        <p style="margin:0 0 28px;color:#6b7280;font-size:13px">
          Monitoring <strong>${companies.length}</strong>
          organisation${companies.length !== 1 ? 's' : ''} for you.
        </p>
        <h2 style="font-size:15px;font-weight:700;color:#111;margin:0 0 20px;
                    padding-bottom:12px;border-bottom:2px solid #6366f1">
          ${updates.length
            ? `🔔 ${updates.length} New Update${updates.length !== 1 ? 's' : ''}`
            : `📋 Today's Digest`}
        </h2>
        ${updatesHtml}
        <div style="text-align:center;margin-top:32px;padding-top:24px;
                    border-top:1px solid #f3f4f6">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
             style="display:inline-block;padding:13px 40px;background:#6366f1;
                    color:#fff;border-radius:8px;font-weight:800;
                    text-decoration:none;font-size:14px">
            Open SK Career →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:11px;margin:16px 0 0">
        SK Career Upstep — Your daily govt job monitor
      </p>
    </div>
  </body></html>`;

  await sendMail(user.email, subject, html);
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────

function pageSimilarity(a, b) {
  const sA = new Set(a.toLowerCase().split(/\s+/));
  const sB = new Set(b.toLowerCase().split(/\s+/));
  const n  = [...sA].filter(w => sB.has(w)).length;
  return n / Math.max(sA.size, sB.size, 1);
}

module.exports = { checkCompany, runDailyCheck };