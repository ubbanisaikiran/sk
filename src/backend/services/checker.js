const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

// ─────────────────────────────────────────────────────────────
// 1. DYNAMIC PATTERNS & HEURISTICS
// ─────────────────────────────────────────────────────────────

// Matches DD/MM/YYYY, DD-MM-YYYY, 12 Jan 2024, etc.
const DATE_REGEX = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi;

const JOB_CONTEXT_KEYWORDS = [
  'vacancy', 'recruitment', 'opening', 'post', 'notification', 'advertisement', 'advt', 
  'apply', 'application', 'last date', 'closing date', 'qualification', 'experience', 
  'pay scale', 'engagement', 'contractual', 'walk-in', 'stipend', 'shortlist', 'result'
];

const DOC_PATTERNS = ['.pdf', '.doc', '.docx', 'attachment', 'download', 'advertisement', 'advt', 'notification', 'circular'];

// Aggressive noise selectors to strip out menus, footers, and sidebars so they don't confuse the density scorer
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'nav', 'header', 'footer', 'iframe',
  '[class*="menu"]', '[class*="nav"]', '[id*="menu"]', '[id*="nav"]',
  '[class*="footer"]', '[id*="footer"]', '[class*="sidebar"]', '[class*="breadcrumb"]',
  '.ticker', '.marquee', '#skip-to-main'
];

const SKIP_URLS = ['javascript:void', 'mailto:', 'tel:', 'facebook.com', 'twitter.com', 'linkedin.com', 'youtube.com'];

// ─────────────────────────────────────────────────────────────
// 2. SMART FETCH (With Auto-Scroll for React/Angular Sites)
// ─────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function smartFetch(url) {
  try {
    const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': UA } });
    const $ = cheerio.load(res.data);
    NOISE_SELECTORS.forEach(sel => $(sel).remove());
    if ($('body').text().replace(/\s+/g, ' ').length > 800) return $; // Has static content
  } catch (e) {
    console.warn(`[fetch] Axios fallback for ${url}`);
  }
  return puppeteerFetch(url); // Fallback to JS rendering
}

async function puppeteerFetch(url) {
  let browser;
  try {
    const puppeteer = require('puppeteer'); // Using standard puppeteer for simplicity here
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Dynamic Scroll: Forces lazy-loaded elements (like Amul/SBI cards) to render
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0, distance = 300;
        let timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight || totalHeight > 3000) {
            clearInterval(timer); resolve();
          }
        }, 200);
      });
    });

    const html = await page.content();
    await browser.close();
    const $ = cheerio.load(html);
    NOISE_SELECTORS.forEach(sel => $(sel).remove());
    return $;
  } catch (e) {
    if (browser) await browser.close();
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. DENSITY SCORER: Finds the "Job Zone" dynamically
// ─────────────────────────────────────────────────────────────

function findDensestJobContainer($) {
  let bestContainer = null;
  let highestScore = 0;

  // Instead of headings, we look at ANY container that holds tabular or list data
  $('table, ul, div.row, div[class*="container"], div[class*="list"]').each((_, el) => {
    const text = $(el).text().toLowerCase();
    let score = 0;

    // 1. Date Density (Crucial for Gov/PSU sites)
    const datesFound = (text.match(DATE_REGEX) || []).length;
    score += (datesFound * 2);

    // 2. Context Density
    JOB_CONTEXT_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) score += 1;
    });

    // 3. Document Link Density
    const docLinks = $(el).find('a').filter((_, a) => {
      const href = ($(a).attr('href') || '').toLowerCase();
      return DOC_PATTERNS.some(p => href.includes(p));
    }).length;
    score += (docLinks * 3);

    // 4. Penalty for massive root divs (we want the specific container, not the whole page)
    const charCount = text.length;
    if (charCount > 10000) score = Math.floor(score / 2); 

    if (score > highestScore && score > 5) { // Threshold to avoid false positives
      highestScore = score;
      bestContainer = el;
    }
  });

  return bestContainer;
}

// ─────────────────────────────────────────────────────────────
// 4. ROW-BASED EXTRACTION (Handles Tables, ULs, and Div grids)
// ─────────────────────────────────────────────────────────────

function extractJobsFromContainer($, container, baseUrl) {
  const jobs = [];
  
  // Determine what constitutes a "Row" in this container
  let rowSelector = 'tr';
  if ($(container).is('ul')) rowSelector = 'li';
  else if ($(container).find('div[class*="row"], div[class*="card"], div[class*="item"]').length > 0) {
    rowSelector = 'div[class*="row"], div[class*="card"], div[class*="item"]';
  }

  $(container).find(rowSelector).each((_, row) => {
    const rowText = $(row).text().replace(/\s+/g, ' ').trim();
    if (rowText.length < 10) return; // Skip empty rows

    const links = [];
    $(row).find('a').each((_, a) => {
      let href = $(a).attr('href');
      let label = $(a).text().replace(/\s+/g, ' ').trim() || 'Link';
      
      if (!href || SKIP_URLS.some(s => href.includes(s))) return;

      // Handle ASPX Postbacks - If it's a postback, we can't scrape the URL, but we CAN alert the user
      if (href.includes('javascript:__doPostBack')) {
        href = baseUrl; // Fallback to sending them to the portal
        label = `[Portal Link] ${label}`;
      } else if (!href.startsWith('http')) {
        try { href = new URL(href, baseUrl).href; } catch { return; }
      }

      links.push({ url: href, label });
    });

    if (links.length > 0) {
      // Create a smart title from the row text, stripping out the links' text
      let title = rowText;
      links.forEach(l => { title = title.replace(l.label, ''); });
      title = title.replace(DATE_REGEX, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().substring(0, 150);

      if (title.length > 5) {
        jobs.push({ title, links });
      }
    }
  });

  return jobs;
}

// ─────────────────────────────────────────────────────────────
// 5. THE GENERALIZED CHECKER
// ─────────────────────────────────────────────────────────────

async function checkCompany(company) {
  const url = company.careerLink || company.announceLink;
  console.log(`\n[Checking] ${company.name} -> ${url}`);

  const $ = await smartFetch(url);
  if (!$) return console.log('Fetch failed.');

  // Step 1: Find the densest "Job Zone" on the page
  const jobContainer = findDensestJobContainer($);

  let extractedJobs = [];
  if (jobContainer) {
    console.log('✓ Found High-Density Job Container');
    extractedJobs = extractJobsFromContainer($, jobContainer, url);
  } else {
    console.log('~ No dense container found. Falling back to whole page document extraction.');
    // Fallback: Just grab all PDF/Apply links from the whole page, grouped by their parent elements
    extractedJobs = extractJobsFromContainer($, $('body'), url); 
  }

  // Filter out junk rows and sort by those that have valid document/apply links
  const validJobs = extractedJobs.filter(job => 
    JOB_CONTEXT_KEYWORDS.some(kw => job.title.toLowerCase().includes(kw)) ||
    job.links.some(l => DOC_PATTERNS.some(p => l.url.toLowerCase().includes(p)))
  );

  if (validJobs.length === 0) return console.log('→ No updates found.');

  // Grab the top 3 most relevant updates
  const topJobs = validJobs.slice(0, 3);
  
  // Format into your database schema
  const newUpdate = {
    title: topJobs[0].title || `New Update from ${company.name}`,
    description: `Found ${topJobs.length} new circulars/openings.`,
    applyLink: topJobs[0].links[0]?.url || url,
    applyLinks: topJobs.flatMap(j => j.links.map(l => l.url)).slice(0, 5),
    applyLabels: topJobs.flatMap(j => j.links.map(l => l.label)).slice(0, 5),
    detectedAt: new Date(),
  };

  // Content hashing to check if it actually changed (using the titles and links)
  const currentFingerprint = topJobs.map(j => j.title + j.links.map(l=>l.url).join('')).join('|');
  
  if (company.lastContent !== currentFingerprint) {
    console.log(`🔔 UPDATE DETECTED: ${newUpdate.title}`);
    company.updates.unshift(newUpdate);
    company.lastContent = currentFingerprint;
    await company.save();
    return newUpdate;
  } else {
    console.log('~ Content unchanged since last check.');
  }
}

module.exports = { checkCompany };