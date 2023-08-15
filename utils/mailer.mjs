import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.simply.com',
  port: 465,    // Common port for SSL
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'rasmus@haversen.dk',
    pass: 'Rasmus123',
  },
});

// Generic function to send email
export const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'rasmus@haversen.dk',
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions);
};

// Function to send confirmation email
export const sendConfirmationEmail = (email, confirmationLink) => {
  const subject = 'Please confirm your email address';
  const text = `Please confirm your email by clicking on the following link: ${confirmationLink}`;

  sendEmail(email, subject, text);
};
