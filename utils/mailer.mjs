import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.gatheron@gmail.com',
    pass: 'alsdJHLK9077)(/)(/',
  },
});

// Generic function to send email
export const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'noreply.gatheron@gmail.com',
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
