import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,    // Common port for SSL
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic function to send email
export const sendEmail = (to, subject, text, html = '') => {
  const mailOptions = {
    from: 'rasmus@haversen.dk',
    to,
    subject,
    text,
    html
  };

  transporter.sendMail(mailOptions);
};


// Function to send confirmation email
export const sendConfirmationEmail = (email, confirmationLink) => {
  const subject = 'Please confirm your email address';
  const text = `Please confirm your email by pasting this link into your browser: ${confirmationLink} \n (Your email inbox does not support HTML)`;
  const html = `<a href="${confirmationLink}">${confirmationLink}</a> <br> <p>Please confirm your email by clicking the link above.</p>`;

  sendEmail(email, subject, text, html);
};

