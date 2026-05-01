import nodemailer from 'nodemailer'
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_USER_PASSWORD // Note: 'pass' not 'password'
    }
});

export const sendEmail = async (to: string, subject?:string,text?: string, html?: string) => {
    // console.log('Email User:', process.env.NODEMAILER_USER);
    // console.log('Email Password:', process.env.NODEMAILER_USER_PASSWORD ? 'SET' : 'NOT SET');
    try {
        const info = await transporter.sendMail({ // 'sendMail' not 'sendEmail'

            from: `"Bridgette Kiehn" <${process.env.NODEMAILER_USER}>`, // Use env var for from email
            to: to,
            subject: subject,
            text: text,
            html: html,
        });

        // console.log("Message sent:", info.messageId);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // Useful for Ethereal
        return info.messageId;
    } catch (error) {
        console.error("Email sending failed:", error);
        throw error; // Re-throw instead of returning error
    }
};

// Optional: Verify connection configuration
export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        // console.log("✅ Email server is ready to take messages");
        return true;
    } catch (error) {
        // console.error("❌ Email server connection failed:", error);
        return false;
    }
};