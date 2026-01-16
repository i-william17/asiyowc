const nodemailer = require('nodemailer');
require("dotenv").config();

// console.log("SMTP CONFIG =>", {
//   service: process.env.SMTP_SERVICE,
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   user: process.env.SMTP_USER,
// });


const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE, // "gmail"
  host: process.env.SMTP_HOST,       // smtp.gmail.com
  port: process.env.SMTP_PORT, // 465
  secure: true, // Gmail on port 465 MUST be secure=true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD, // matches YOUR .env
  },
  tls: {
    rejectUnauthorized: false,
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER, // Gmail requires this
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", result.messageId);

    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    return false;
  }
};
