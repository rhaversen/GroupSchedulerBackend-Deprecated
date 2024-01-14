// Node.js built-in modules

// Third-party libraries
import nodemailer from 'nodemailer'

// Own modules
import { getEmailFrom, getTransporterPort } from './setupConfig.js'
import logger from './logger.js'

// Config
const transporterPort = getTransporterPort()
const emailFrom = getEmailFrom()

// Generic function to send email
export const sendEmail = async (to: string, subject: string, text: string, html = ''): Promise<void> => {
    if (process.env.NODE_ENV === 'test') return

    // Configure transporter
    logger.debug('Creating email transporter')
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SERVER,
        port: transporterPort,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_LOGIN,
            pass: process.env.SMTP_KEY
        }
    })

    logger.debug('Created transporter')

    const mailOptions = {
        from: emailFrom,
        to,
        subject,
        text,
        html
    }

    logger.debug('Sending email')
    await transporter.sendMail(mailOptions)

    logger.debug('Closing email transporter')
    transporter.close()
    logger.debug('Email transporter closed')
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
    const text = `Please reset your password by pasting this link into your browser: ${passwordResetLink} \n If you didn't request a password reset, it's safe to ignore this mail. Someone probably entered your email by mistake \n (Your email inbox does not support HTML)`
    const html = `<a href="${passwordResetLink}">${passwordResetLink}</a> <br> <p>Please reset your password by clicking the link above.</p> <br> <p>If you didn't request a password reset, it's safe to ignore this mail. Someone probably entered your email by mistake.</p>`

    await sendEmail(email, subject, text, html)
}

// Function to send email not registered email
export const sendEmailNotRegisteredEmail = async (email: string): Promise<void> => {
    const subject = 'Email not signed up'
    const text = 'A password reset has been requested for this email, but it has not been used to sign up for a user on raindate.net. Please sign up instead. \n If you didn\'t request a password reset, it\'s safe to ignore this mail. Someone probably entered your email by mistake.'
    const html = '<p>A password reset has been requested for this email, but it has not been used to sign up for a user on raindate.net. Please sign up instead.</p> <br> <p>If you didn\'t request a password reset, it\'s safe to ignore this mail. Someone probably entered your email by mistake.</p>'

    await sendEmail(email, subject, text, html)
}
