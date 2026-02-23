const axios    = require('axios');
const cheerio  = require('cheerio');
const Company  = require('../models/Company');
const User     = require('../models/User');
const { sendMail } = require('./mailer');

// ── Constants ─────────────────────────────────────────────────

const JOB_KEYWORDS = [
  'opening', 'hiring', 'vacancy', 'vacancies', 'position',
  'recruit', 'deadline', 'notification', 'result', 'admit card',
  'walk-in', 'interview', 'shortlist', 'advertisement',
  'recruitment', 'application', 'post', 'last date', 'closing date',
  'no. of post', 'qualification', 'experience required',
  'job description', 'responsibilities', 'requirements',
  'full time', 'part time', 'remote', 'hybrid', 'fresher',
];

const JOB_CONTEXT_SIGNALS = [
  'vacancy', 'vacancies', 'post', 'qualification', 'experience',
  'last date', 'closing date', 'apply', 'notification', 'recruitment',
  'advertisement', 'corrigendum', 'result', 'shortlist',
  'job description', 'responsibilities', 'location', 'salary',
  'package', 'lpa', 'ctc', 'fresher', 'remote', 'hybrid',
];

const SKIP_LINK_TEXTS = [
  'know more', 'view all', 'read more', 'click here', 'home', 'about',
  'contact', 'login', 'logout', 'register', 'sign in', 'sign up',
  'personal loan', 'home loan', 'car loan', 'education loan', 'gold loan',
  'savings account', 'fixed deposit', 'credit card', 'debit card',
  'insurance', 'mutual fund', 'locate us', 'branches', 'atm',
  'sitemap', 'privacy', 'disclaimer', 'terms', 'cookie', 'faq',
  'feedback', 'grievance', 'complaint', 'customer support',
  'skip to', 'accessibility', 'screen reader', 'hindi', 'english',
  'a+', 'a-', 'download app', 'play store', 'app store',
  'follow us', 'share', 'tweet', 'like', 'subscribe',
];

const SKIP_URL_PATTERNS = [
  'play.google.com', 'apps.apple.com', 'facebook.com', 'twitter.com',
  'linkedin.com/company', 'youtube.com', 'instagram.com', 'whatsapp.com',
  'javascript:', 'mailto:', 'tel:', '#',
  'netbanking', 'internetbanking', 'onlinebanking',
  'bobcrm', 'pmsuryaghar', 'vidyalakshmi', 'pmvidyalaxmi',
  'calculator', 'emi-calc', 'fd-calc',
  'locate-us', '/branches', '/atm', '/faqs', '/contact',
  '/sitemap', '/privacy', '/disclaimer', '/terms',
  'outlook.com', 'intranet', 'medibuddy',
  // Insurance & financial product apply links — NOT job links
  'indiafirstlife.com', 'indiafirst', 'lifeinsurance',
  'buyonline', 'applyonline', 'onlineapply',
  'loanapply', 'applyloan', 'loan-apply', 'apply-loan',
  'cardapply', 'applycard', 'apply-card',
  'pmsuryaghar', 'pmvidyalaxmi', 'vidyalakshmi',
  'pmjdy', 'mudra', 'standupmitra',
  'dil.bank', 'dil2.bank', 'feba.bob', 'bobprepaid',
  'barodaetrade', 'mfs.kfintech', 'kfintech',
  'nsdl.com', 'cra.kfintech', 'mynps',
  'bobworld', 'bobworldetrade',
  'smarttrade', 'diginext',
  'cms.rbi', 'sachet.rbi', 'rbi.org',
  'india.gov.in', 'sancharsaathi', 'cybercrime.gov',
  'bobcards.com', 'bobcard.co',
  'barodabnpparibasmf', 'infradebt', 'bgss.in',
];

const NO_VACANCY_PHRASES = [
  'no vacancies', 'no current openings', 'no openings available',
  'currently there are no vacancies', 'no posts available',
  'no positions available', 'check back later', 'no active recruitment',
  'no job openings', 'no current vacancies', 'kindly check back later',
  'no recruitment', 'at present no vacancy', 'no open positions',
  'no open roles', 'no jobs found', 'no results found',
  'कोई रिक्तियां नहीं', 'कोई पद नहीं', 'वर्तमान में कोई',
];

// ── ATS Detection ─────────────────────────────────────────────
// Many companies use these platforms — we extract jobs directly

const ATS_PATTERNS = [
  {
    name: 'Workday',
    detect: url => url.includes('myworkdayjobs.com') || url.includes('wd3.myworkday') || url.includes('wd5.myworkday'),
    extract: async (url) => {
      // Workday API endpoint pattern
      const match = url.match(/https?:\/\/([^/]+\.myworkday(?:jobs)?\.com)\/([^/]+)/);
      if (!match) return null;
      const apiUrl = `${match[0]}/fs/searchableJobs?limit=20&offset=0&format=json`;
      try {
        const res = await axios.get(apiUrl, { timeout: 10000 });
        const jobs = res.data?.jobPostings || [];
        return jobs.slice(0, 6).map(j => ({
          url: `${match[0]}/job/${j.externalPath || j.title}`,
          label: j.title,
          score: 10,
        }));
      } catch { return null; }
    },
  },
  {
    name: 'Greenhouse',
    detect: url => url.includes('boards.greenhouse.io') || url.includes('greenhouse.io/embed'),
    extract: async (url) => {
      const match = url.match(/greenhouse\.io\/(?:embed\/job_board\?for=|)([a-zA-Z0-9_-]+)/);
      if (!match) return null;
      try {
        const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${match[1]}/jobs?content=true`, { timeout: 10000 });
        const jobs = res.data?.jobs || [];
        return jobs.slice(0, 6).map(j => ({
          url: j.absolute_url,
          label: j.title,
          score: 10,
        }));
      } catch { return null; }
    },
  },
  {
    name: 'Lever',
    detect: url => url.includes('jobs.lever.co'),
    extract: async (url) => {
      const match = url.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/);
      if (!match) return null;
      try {
        const res = await axios.get(`https://api.lever.co/v0/postings/${match[1]}?mode=json`, { timeout: 10000 });
        const jobs = Array.isArray(res.data) ? res.data : [];
        return jobs.slice(0, 6).map(j => ({
          url: j.hostedUrl,
          label: j.text,
          score: 10,
        }));
      } catch { return null; }
    },
  },
  {
    name: 'Taleo',
    detect: url => url.includes('taleo.net'),
    extract: async (url) => {
      // Taleo uses org-specific URLs — just return the URL itself as the apply link
      return [{ url, label: 'View Openings on Taleo', score: 8 }];
    },
  },
  {
    name: 'SmartRecruiters',
    detect: url => url.includes('careers.smartrecruiters.com'),
    extract: async (url) => {
      const match = url.match(/smartrecruiters\.com\/([a-zA-Z0-9_-]+)/);
      if (!match) return null;
      try {
        const res = await axios.get(`https://api.smartrecruiters.com/v1/companies/${match[1]}/postings?limit=10`, { timeout: 10000 });
        const jobs = res.data?.content || [];
        return jobs.slice(0, 6).map(j => ({
          url: `https://careers.smartrecruiters.com/${match[1]}/${j.id}`,
          label: j.name,
          score: 10,
        }));
      } catch { return null; }
    },
  },
  {
    name: 'iCIMS',
    detect: url => url.includes('icims.com'),
    extract: async (url) => {
      return [{ url, label: 'View Openings', score: 8 }];
    },
  },
];

// ── Universal link scorer ─────────────────────────────────────
// Domains that are NEVER job application destinations
const NON_JOB_DOMAINS = [
  'indiafirstlife.com', 'buyonline', 'lifeinsure', 'generalinsure',
  'nsdl.com', 'kfintech', 'csdl.com', 'bse', 'nse',
  'pmsuryaghar', 'vidyalakshmi', 'mudra', 'standup',
  'rbi.org', 'sebi.gov', 'irdai.gov',
  'bobcard', 'creditcard', 'debitcard',
  'loanapply', 'applyloan', 'emiloan',
];

// URL path patterns that ARE job destinations
const JOB_URL_PATHS = [
  '/job', '/jobs', '/career', '/careers', '/recruit', '/recruitment',
  '/vacancy', '/vacancies', '/opening', '/openings', '/hiring',
  '/apply', '/notification', '/advertisement', '/circular',
  '.pdf', '.doc', '.docx',
  'ibps', 'ssc.nic', 'ncs.gov', 'upsc', 'nta.ac.in',
  'crpd', 'bankingcareer', 'careerportal',
];

function scoreLink(linkText, linkUrl, contextText) {
  if (!linkText || linkText.length < 3) return -1;
  if (SKIP_LINK_TEXTS.some(s => linkText.toLowerCase().includes(s))) return -1;
  if (SKIP_URL_PATTERNS.some(p => linkUrl.toLowerCase().includes(p))) return -1;
  if (NON_JOB_DOMAINS.some(d => linkUrl.toLowerCase().includes(d))) return -1;

  let score = 0;
  const ctx = contextText.toLowerCase();
  const txt = linkText.toLowerCase();
  const url = linkUrl.toLowerCase();

  // Strong signals — file types
  if (url.includes('.pdf'))        score += 4;
  if (url.match(/\.(doc|docx)$/)) score += 3;

  // URL path looks like a job/career URL — strong positive
  const isJobUrl = JOB_URL_PATHS.some(p => url.includes(p));
  if (isJobUrl) score += 4;

  // Link text matches job keywords
  if (JOB_KEYWORDS.some(k => txt.includes(k))) score += 4;

  // Context signals
  const contextSignals = JOB_CONTEXT_SIGNALS.filter(s => ctx.includes(s)).length;
  score += Math.min(contextSignals, 5);

  // "Apply Now" — ONLY score high if URL is clearly a job URL
  // Otherwise penalize heavily — it's probably a product CTA
  if (txt === 'apply now' || txt === 'apply') {
    if (isJobUrl) {
      score += 4;
    } else {
      // "Apply Now" on non-job URL = product CTA, reject
      return -1;
    }
  }

  // Known job portals
  const jobPortals = ['ibps', 'ssc.nic', 'ncs.gov', 'upsc', 'nta.ac.in', 'employment'];
  if (jobPortals.some(p => url.includes(p))) score += 3;

  return score;
}
// ── Fetch page HTML (with JS fallback) ───────────────────────
async function fetchHTML(url) {
  // First try fast axios fetch
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    const html = res.data;

    // Check if page has meaningful content or is mostly JS shell
    const $ = cheerio.load(html);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // If page has enough text content, use it
    if (bodyText.length > 500) {
      return { html, method: 'axios' };
    }

    // Page is likely JS-rendered — try puppeteer
    return await fetchWithPuppeteer(url);
  } catch (err) {
    console.warn(`[fetcher] axios failed for ${url}: ${err.message}`);
    return await fetchWithPuppeteer(url);
  }
}

async function fetchWithPuppeteer(url) {
  try {
    let chromium, puppeteer;
    try {
      chromium  = require('@sparticuz/chromium');
      puppeteer = require('puppeteer-core');
    } catch {
      console.warn('[fetcher] Puppeteer not available');
      return null;
    }

    const browser = await puppeteer.launch({
      args:            chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:  await chromium.executablePath(),
      headless:        chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    // Wait for job listings to appear
    await page.waitForTimeout(2000);

    const html = await page.content();
    await browser.close();
    console.log(`[fetcher] Puppeteer succeeded for ${url}`);
    return { html, method: 'puppeteer' };
  } catch (err) {
    console.warn(`[fetcher] Puppeteer failed for ${url}: ${err.message}`);
    return null;
  }
}

// ── Extract jobs from HTML ────────────────────────────────────
function extractFromHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const scoredLinks = [];
  let bestTitle = '';
  let bestDesc  = '';

  // Remove noise
  $('script, style, noscript').remove();
  $('nav, header, footer').remove();
  $('[class*="nav"],[class*="menu"],[class*="header"],[class*="footer"]').remove();
  $('[class*="accessibility"],[class*="toolbar"],[class*="breadcrumb"]').remove();
  $('[class*="social"],[class*="share"],[class*="skip"],[class*="cookie"]').remove();
  $('[class*="sidebar"],[class*="widget"],[class*="banner"],[class*="popup"]').remove();
  $('[id*="nav"],[id*="menu"],[id*="header"],[id*="footer"],[id*="sidebar"]').remove();

  // Score every link
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : (() => {
      try { return new URL(href, baseUrl).href; } catch { return null; }
    })();
    if (!fullUrl) return;

    const context = $(el)
      .closest('tr, li, div, section, article, td')
      .text()
      .replace(/\s+/g, ' ')
      .slice(0, 600);

    const score = scoreLink(text, fullUrl, context);
    if (score >= 3) {
      const existing = scoredLinks.find(l => l.url === fullUrl);
      if (!existing) {
        scoredLinks.push({ url: fullUrl, label: text, score });
      } else if (score > existing.score) {
        existing.score = score;
        existing.label = text;
      }
    }
  });

  // Extract title
  $('h1, h2, h3, h4').each((_, el) => {
    const t = $(el).text().trim();
    const tLow = t.toLowerCase();
    if (
      t.length > 8 && t.length < 150 &&
      !SKIP_LINK_TEXTS.some(s => tLow.includes(s)) &&
      (JOB_KEYWORDS.some(k => tLow.includes(k)) || tLow.includes('current') || tLow.includes('career') || tLow.includes('opportunit'))
    ) {
      if (!bestTitle) bestTitle = t;
      return false;
    }
  });

  // Extract description
  $('p, li, td').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (
      text.length > 40 && text.length < 300 &&
      JOB_KEYWORDS.some(k => text.toLowerCase().includes(k)) &&
      !text.toLowerCase().match(/^(date|s\.?no|sr\.?no|download|sl\.?no|closing|serial)/i)
    ) {
      if (!bestDesc) bestDesc = text.slice(0, 220);
      return false;
    }
  });

  return { scoredLinks, bestTitle, bestDesc };
}

// ── Main check function ───────────────────────────────────────
async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  console.log(`[checker] Scanning ${company.name} — ${urls.length} URL(s):`, urls);

  let allScoredLinks = [];
  let bestTitle      = '';
  let bestDesc       = '';
  let combinedFP     = '';
  let hasContent     = false;

  for (const url of urls) {
    console.log(`[checker] Processing: ${url}`);

    // ── Check ATS first ──────────────────────────────────────
    const ats = ATS_PATTERNS.find(a => a.detect(url));
    if (ats) {
      console.log(`[checker] Detected ATS: ${ats.name}`);
      const atsLinks = await ats.extract(url);
      if (atsLinks && atsLinks.length > 0) {
        allScoredLinks.push(...atsLinks);
        hasContent = true;
        if (!bestTitle) bestTitle = `${company.name} — Open Positions`;
        if (!bestDesc) bestDesc = `${atsLinks.length} open position(s) found on ${ats.name}.`;
        combinedFP += url + ':ats:' + atsLinks.map(l => l.url).join(',') + '|';
        continue;
      }
    }

    // ── Fetch HTML ───────────────────────────────────────────
    const result = await fetchHTML(url);
    if (!result) {
      console.warn(`[checker] Could not fetch ${url}`);
      continue;
    }

    // ── No vacancy check ─────────────────────────────────────
    const $ = cheerio.load(result.html);
    const rawText = $('body').text().replace(/\s+/g, ' ').toLowerCase();

    if (NO_VACANCY_PHRASES.some(p => rawText.includes(p))) {
      console.log(`[checker] ${url} → No vacancy signal, skipping`);
      combinedFP += url + ':no-vacancy|';
      continue;
    }

    // ── Empty job table check ────────────────────────────────
    let emptyTable = false;
    $('table').each((_, table) => {
      const tText = $(table).text().toLowerCase();
      const hasJobHeader = JOB_CONTEXT_SIGNALS.some(s => tText.includes(s));
      if (hasJobHeader && $(table).find('tbody tr').length === 0) emptyTable = true;
    });
    if (emptyTable) {
      console.log(`[checker] ${url} → Empty job table, skipping`);
      combinedFP += url + ':empty-table|';
      continue;
    }

    // ── Extract from HTML ────────────────────────────────────
    const { scoredLinks, bestTitle: t, bestDesc: d } = extractFromHTML(result.html, url);

    console.log(`[checker] ${url} [${result.method}] → ${scoredLinks.length} links`);

    if (scoredLinks.length > 0) hasContent = true;
    if (!bestTitle && t) bestTitle = t;
    if (!bestDesc  && d) bestDesc  = d;

    // Merge links
    for (const link of scoredLinks) {
      const existing = allScoredLinks.find(l => l.url === link.url);
      if (!existing) {
        allScoredLinks.push(link);
      } else if (link.score > existing.score) {
        existing.score = link.score;
        existing.label = link.label;
      }
    }

    combinedFP += url + ':' + scoredLinks.map(l => l.url).join(',') + '|';
  }

  // Sort by score, take top 6
  allScoredLinks.sort((a, b) => b.score - a.score);
  const topLinks = allScoredLinks.slice(0, 6);

  console.log(`[checker] ${company.name} → Final: ${topLinks.length} links, hasContent: ${hasContent}`);
  if (topLinks.length) {
    console.log(`[checker] Top links:`, topLinks.map(l => `[${l.score}] ${l.label}`));
  }

  if (!hasContent && !bestDesc) {
    console.log(`[checker] ${company.name} → No real job content, skipping`);
    company.lastChecked = new Date();
    await company.save();
    return null;
  }

  const currentContent = combinedFP + bestDesc;
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