const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

const OPENING_SECTION_TITLES = [
  'current opening', 'current opportunity', 'current vacancy',
  'current recruitment', 'current position', 'active opening',
  'active vacancy', 'open position', 'open role', 'job opening',
  'job listing', 'career opportunity', 'latest opening', 'new opening',
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
  'javascript:',
  'mailto:',
  'tel:',
  'facebook.com',
  'twitter.com',
  'youtube.com',
  'instagram.com',
  'whatsapp.com',
  'play.google.com',
  'apps.apple.com',
  'linkedin.com/company',
];

// ── General text normalizer ───────────────────────────────────
// Handles extra spaces, special chars, unicode variations
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "'")       // normalize quotes
    .replace(/[–—]/g, '-')        // normalize dashes
    .replace(/\s+/g, ' ')         // collapse whitespace
    .replace(/[^\w\s\u0900-\u097f'-]/g, ' ') // remove special chars except Hindi
    .trim();
}

// Check if normalized text contains any of the phrases
function containsAny(text, phrases) {
  const n = normalize(text);
  return phrases.some(p => n.includes(normalize(p)));
}

// ── Nav link detector (blocks siblings AND parents) ───────────
function isNavLink(fullUrl, pageUrl) {
  try {
    const link = new URL(fullUrl);
    const page = new URL(pageUrl);

    // Different domain — never a nav link
    if (link.hostname !== page.hostname) return false;

    const linkPath = link.pathname.toLowerCase().replace(/\/$/, '');
    const pagePath = page.pathname.toLowerCase().replace(/\/$/, '');

    // Same page — not a nav link
    if (linkPath === pagePath) return false;

    // Is it a doc/job path? Always allow through
    const isDoc = linkPath.match(/\.(pdf|doc|docx)$/) ||
      ['attachment','download','getfile','getcareer',
       'notification','advertisement','advt','circular',
       'image/get','getattachment'].some(p => linkPath.includes(p));
    if (isDoc) return false;

    const isJobPath = ['/job','/recruit','/vacancy','/opening',
                       '/apply','/notification','/advertisement',
                       '/career-opportunit'].some(p => linkPath.includes(p));
    if (isJobPath) return false;

    // ── Block parent paths ──────────────────────────────────
    // e.g. page=/career/current-opportunities, link=/career → block
    const isParent = pagePath.startsWith(linkPath + '/');
    if (isParent) return true;

    // ── Block sibling paths ─────────────────────────────────
    // e.g. page=/career/current-opportunities, link=/career/final-results → block
    const parentPath = pagePath.split('/').slice(0, -1).join('/');
    const isSibling  = linkPath.startsWith(parentPath + '/') && linkPath !== pagePath;
    if (isSibling) return true;

    return false;
  } catch { return false; }
}

// ── Fetch + clean page ────────────────────────────────────────
async function fetchPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const $ = cheerio.load(res.data);
    $('script, style, noscript').remove();
    $('[class*="navbar"],[class*="topbar"],[class*="sidenav"]').remove();
    $('[class*="accessibility"],[class*="toolbar"],[class*="breadcrumb"]').remove();
    $('[class*="social"],[class*="share"],[class*="cookie"],[class*="popup"]').remove();
    $('[id*="header"],[id*="footer"],[id*="sidebar"]').remove();
    return $;
  } catch (err) {
    console.warn(`[checker] Fetch failed ${url}: ${err.message}`);
    return null;
  }
}

// ── Full page empty check ─────────────────────────────────────
function pageIsEmpty($) {
  const text = $('body').text();
  return containsAny(text, EMPTY_SIGNALS);
}

// ── Find openings section ─────────────────────────────────────
function findOpeningsSection($) {
  let bestEl = null, bestScore = 0;

  // Search headings
  $('h1, h2, h3, h4, h5').each((_, el) => {
    const text  = $(el).text();
    const score = OPENING_SECTION_TITLES.filter(t => containsAny(text, [t])).length;
    if (score > bestScore) { bestScore = score; bestEl = el; }
  });

  // Search section/div id and class
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

// ── Section has real content? ─────────────────────────────────
function sectionHasRealContent($, section) {
  const text = $(section).text();

  if (containsAny(text, EMPTY_SIGNALS)) {
    console.log('[checker] ✗ Section has empty signal'); return false;
  }

  let emptyJobTable = false;
  $(section).find('table').each((_, table) => {
    const tText  = $(table).text();
    const isJob  = containsAny(tText, ['vacancy','position','post','role','qualification','experience']);
    const rows   = $(table).find('tbody tr').length;
    if (isJob && rows === 0) { emptyJobTable = true; return false; }
  });
  if (emptyJobTable) { console.log('[checker] ✗ Empty job table'); return false; }

  const links = $(section).find('a').length;
  const rows  = $(section).find('tbody tr, li').length;
  const tlen  = text.replace(/\s+/g, ' ').trim().length;
  console.log(`[checker] Section — links:${links} rows:${rows} textLen:${tlen}`);
  return tlen > 60 && (links > 0 || rows > 0);
}

// ── Find job table in element ─────────────────────────────────
function findJobTable($, el) {
  let found = null;
  $(el).find('table').each((_, table) => {
    const headerText = $(table).find('thead, tr').first().text();
    const isJob = containsAny(headerText,
      ['download','notification','recruitment','vacancy','closing','publishing','date of']);
    if (isJob) { found = table; return false; }
  });
  return found;
}

// ── Collect document links ────────────────────────────────────
function collectDocumentLinks($el, baseUrl, $) {
  const links = [];

  const DOC_URL_PATTERNS = [
    '.pdf', '.doc', '.docx',
    'attachment', 'getfile', 'getdoc',
    'getcareer', 'recruitmentfile',
    'advt', 'advertisement', 'circular',
    'careerattachment', 'image/get', 'getattachment', 'filedownload',
  ];

  const DOC_LINK_PHRASES = [
    'advertisement', 'notification', 'apply online',
    'application form', 'advt', 'circular',
    'recruitment', 'vacancy details',
    'click here to apply', 'brochure', 'detailed',
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

    const hrefLow   = href.toLowerCase();
    const isDocUrl  = DOC_URL_PATTERNS.some(p => hrefLow.includes(p));
    const isDocText = containsAny(rawText, DOC_LINK_PHRASES);
    if (!isDocUrl && !isDocText) return;

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

// ── Extract links from section ────────────────────────────────
function extractLinks($, section, pageUrl) {
  const links = [];

  // Job table present? Only extract from tbody rows
  const jobTable = findJobTable($, section);
  if (jobTable) {
    console.log('[checker] Job table found — tbody only');
    $(jobTable).find('tbody tr').each((_, row) => {
      $(row).find('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!href || href === '#' || href.startsWith('#')) return;
        if (text.length < 2) return;
        if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
        const fullUrl = href.startsWith('http') ? href : (() => {
          try { return new URL(href, pageUrl).href; } catch { return null; }
        })();
        if (!fullUrl) return;
        if (isNavLink(fullUrl, pageUrl)) { console.log(`   [skip nav] ${text}`); return; }
        if (links.find(l => l.url === fullUrl)) return;
        links.push({ url: fullUrl, label: text });
      });
    });
    return links;
  }

  // No job table — extract all links, skip nav
  $(section).find('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href === '#' || href.startsWith('#')) return;
    if (text.length < 2) return;
    if (SKIP_URLS.some(p => href.toLowerCase().includes(p))) return;
    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, pageUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;
    if (isNavLink(fullUrl, pageUrl)) { console.log(`   [skip nav] ${text}`); return; }
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

// ── Main check function ───────────────────────────────────────
async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`\n[checker] ══════════════════════════════`);
  console.log(`[checker] ${company.name}`);
  console.log(`[checker] URLs: ${urls.join(' | ')}`);

  let allLinks = [], bestTitle = '', bestDesc = '', fingerprint = '', foundContent = false;

  for (const url of urls) {
    console.log(`\n[checker] → ${url}`);
    const $ = await fetchPage(url);
    if (!$) { fingerprint += url + ':fetch-failed|'; continue; }

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
        fingerprint += url + ':no-content|';
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
      // JS-rendered (Bank of Baroda) — use the exact page URL user gave
      console.log(`[checker] ~ STEP 4 — JS-rendered, using page URL`);
      foundContent = true;
      if (!bestTitle && title) bestTitle = title;
      if (!bestDesc  && desc)  bestDesc  = desc;
      allLinks.push({ url, label: 'View Current Opportunities' });
      fingerprint += url + ':js-rendered|';
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