const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, text }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"CBL Request Approver" <no-reply@cbl.com>',
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };