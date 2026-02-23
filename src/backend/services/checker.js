const axios   = require('axios');
const cheerio = require('cheerio');
const Company = require('../models/Company');
const User    = require('../models/User');
const { sendMail } = require('./mailer');

const JOB_KEYWORDS = [
  'opening', 'hiring', 'vacancy', 'apply', 'position',
  'recruit', 'deadline', 'notification', 'result',
  'admit card', 'walk-in', 'interview', 'shortlist',
];

// ── Check a single company ────────────────────────────────────
async function checkCompany(company) {
  const urls = [company.announceLink, company.careerLink].filter(u => u?.trim());
  if (!urls.length) return null;

  let combinedContent = '';
  const allJobLinks = [];

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (SK-Career-Bot/1.0)' },
      });

      const $ = cheerio.load(res.data);
      $('script, style, nav, footer, header, noscript').remove();
      combinedContent += $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);

      // Collect PDF, doc and job links
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (!href) return;

        const fullUrl = href.startsWith('http') ? href : (() => {
          try { return new URL(href, url).href; } catch { return null; }
        })();
        if (!fullUrl) return;

        const isPdf  = fullUrl.toLowerCase().includes('.pdf');
        const isDoc  = fullUrl.toLowerCase().match(/\.(doc|docx)$/);
        const isJob  = JOB_KEYWORDS.some(k => text.toLowerCase().includes(k));

        if ((isPdf || isDoc || isJob) && !allJobLinks.includes(fullUrl)) {
          allJobLinks.push(fullUrl);
        }
      });

    } catch (err) {
      console.warn(`[checker] Could not fetch ${url}: ${err.message}`);
    }
  }

  if (!combinedContent) {
    company.lastChecked = new Date();
    await company.save();
    return null;
  }

  const currentContent = combinedContent.slice(0, 6000);

  const changed = company.lastContent
    ? pageSimilarity(company.lastContent, currentContent) < 0.93
    : true;

  let newUpdate = null;
  if (changed) {
    const sentences = extractJobSentences(company.lastContent || '', currentContent);
    if (sentences.length > 0 || (!company.lastContent && allJobLinks.length > 0)) {
      newUpdate = {
        title: sentences.length
          ? sentences[0].slice(0, 100)
          : `New opening at ${company.name}`,
        description: sentences.length > 1
          ? sentences.slice(1).join(' · ')
          : `${company.name} has posted new career information. Check the links below.`,
        applyLink:  allJobLinks[0] || company.careerLink || '',
        applyLinks: allJobLinks.slice(0, 5),
        detectedAt: new Date(),
      };
      company.updates.unshift(newUpdate);
      if (company.updates.length > 50) company.updates.length = 50;
    }
  }

  company.lastContent = currentContent;
  company.lastChecked = new Date();
  await company.save();
  return newUpdate;
}

// ── Daily check for all users ─────────────────────────────────
async function runDailyCheck() {
  const users = await User.find({}).lean();
  console.log(`[checker] Daily run — ${users.length} user(s)`);

  for (const user of users) {
    try {
      const companies = await Company.find({ userId: user._id }).select('+lastContent');
      if (!companies.length) continue;

      await Promise.allSettled(companies.map(c => checkCompany(c)));

      const fresh = await Company.find({ userId: user._id });
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

// ── Send daily email digest ───────────────────────────────────
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
                const name = link.split('/').pop().split('?')[0] || `Document ${i + 1}`;
                const isPdf = link.toLowerCase().includes('.pdf');
                return `<a href="${link}" style="display:inline-block;margin:4px;padding:8px 16px;background:#ede9fe;color:#6366f1;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">
                  ${isPdf ? '📄' : '📎'} ${name}
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

function extractJobSentences(oldContent, newContent) {
  const old = oldContent.toLowerCase();
  return newContent
    .split(/[.\n!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200)
    .filter(s => JOB_KEYWORDS.some(k => s.toLowerCase().includes(k)))
    .filter(s => !old.includes(s.toLowerCase().slice(0, 30)))
    .slice(0, 2);
}

module.exports = { checkCompany, runDailyCheck };