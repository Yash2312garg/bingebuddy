//notification-service/src/providers/email.provider.ts
import nodemailer from "nodemailer";
import "dotenv/config";
import type { Notification_Templates_ENUM } from "../types/notificationTemplate.types"; // Fixed typo here
import { notification_templates } from "../services/notificationTemplate";
import { htmlToText } from "nodemailer-html-to-text";
import Handlebars from "handlebars";

export class EmailProvider {
  private static transporter = nodemailer
    .createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_USER_PASSWORD, 
      },
    })
    .use("compile", htmlToText()); 

  static async verifyEmailConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email server is ready to take messages");
      return true;
    } catch (error) {
      console.error("❌ Email server connection failed:", error);
      return false;
    }
  }

  private static async prepareEmailData(
    template_code: Notification_Templates_ENUM,
    data: any,
  ) {
    switch (template_code) {
      case "AUTH_OTP_REQUEST":
        return await getOtpEmailContent(template_code, data); // Passed template_code cleanly
      
      // 2. FIXED: Throw early if the template isn't recognized
      default:
        throw new Error(`Unsupported email template code: ${template_code}`);
    }
  }

  static sendEmail = async (data: any) => {
    try {
      const template_code: Notification_Templates_ENUM = data.template_code;
      
      const email_data = await this.prepareEmailData(template_code, data);
      
      if (!email_data) {
        throw new Error("Data not found to send the email");
      }

      const info = await this.transporter.sendMail({
        from: `"BingeBuddy" <${process.env.NODEMAILER_USER}>`, 
        to: email_data.to,
        subject: email_data.subject,
        html: email_data.html,
      });

      console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); 
      return info.messageId;
    } catch (error) {
      console.error("Email sending failed:", error);
      throw error; 
    }
  };
}

export const getOtpEmailContent = async (
  template_code: Notification_Templates_ENUM,
  data: {
    company_name: string;
    minutes: string;
    otp: string;
    to: string;
    subject: string;
  },
) => {
  const email_content = await notification_templates.getTemplate(template_code);
  
  if (email_content) {
    // 3. Excellent use of Handlebars here!
    const template = Handlebars.compile(email_content.body_content);
    const final_data = template(data);
    return { to: data.to, subject: data.subject, html: final_data };
  }
  
  throw new Error(`Unable to fetch template from database for ${template_code}`);
};