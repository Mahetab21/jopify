import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer/index";
import { randomInt } from "node:crypto";
import { AppError } from "../utils/classError";

export const sendEmail = async (mailOptions: Mail.Options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) throw new AppError("Email service is not configured", 503);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  await transporter.sendMail({ from: `Jobify <${process.env.EMAIL_USER}>`, ...mailOptions });
};
export const generateOtp = async () => randomInt(100000, 1000000);
