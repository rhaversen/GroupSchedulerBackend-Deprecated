// Node.js built-in modules
import config from 'config'

import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

// Config
const transporterPort = Number(config.get('email.port'))
const emailFrom = String(config.get('email.from'))

dotenv.config()

// Configure transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: transporterPort,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Generic function to send email
export const sendEmail = async (to: string, subject: string, text: string, html = ''): Promise<void> => {
    const mailOptions = {
        from: emailFrom,
        to,
        subject,
        text,
        html
    }

    await transporter.sendMail(mailOptions)
}

// Function to send confirmation email
export const sendConfirmationEmail = async (email: string, confirmationLink: string): Promise<void> => {
    const subject = 'Please confirm your email address'
    const text = `Please confirm your email by pasting this link into your browser: ${confirmationLink} \n (Your email inbox does not support HTML)`
    const html = `<a href="${confirmationLink}">${confirmationLink}</a> <br> <p>Please confirm your email by clicking the link above.</p>`

    await sendEmail(email, subject, text, html)
}
