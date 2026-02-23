const nodemailer = require('nodemailer');

let _transport = null;



function transport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
  return _transport;
}

async function sendMail(to, subject, html) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('[mailer] MAIL_USER / MAIL_PASS not set — email skipped');
    return;
  }
  try {
    const info = await transport().sendMail({
      from: `"SK Career Upgrade ⚡" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[mailer] Sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[mailer] Failed:', err.message);
  }
}

module.exports = { sendMail };