// Node.js built-in modules

// Third-party libraries
import nodemailer from 'nodemailer'

// Own modules
import {
    getTransporterPort,
    getEmailFrom
} from './setupConfig.js'

// Config
const transporterPort = getTransporterPort()
const emailFrom = getEmailFrom()

// Configure transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: transporterPort,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_KEY
    }
})

// Generic function to send email
export const sendEmail = async (to: string, subject: string, text: string, html = ''): Promise<void> => {
    if (process.env.NODE_ENV === 'test') return

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

// Function to send password reset email
export const sendPasswordResetEmail = async (email: string, passwordResetLink: string): Promise<void> => {
    const subject = 'Password reset requested'
    const text = `Please reset your password by pasting this link into your browser: ${passwordResetLink} \n (Your email inbox does not support HTML)`
    const html = `<a href="${passwordResetLink}">${passwordResetLink}</a> <br> <p>Please reset your password by clicking the link above.</p>`

    await sendEmail(email, subject, text, html)
}
