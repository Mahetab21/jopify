import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer/index";
export const sendEmail=async(mailOptions:Mail.Options)=>{
  console.log(mailOptions);
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD);

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
  await transporter.verify();
  console.log("SMTP Connected");


  const info = await transporter.sendMail({
    from: `Jopify <${process.env.EMAIL_USER}>`,
    ...mailOptions
  });

  console.log("Message sent:", info.messageId);

}
export const generateOtp=async()=>{
    return Math.floor(Math.random()*(999999-100000+1)+100000);
}