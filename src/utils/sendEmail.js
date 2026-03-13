// import nodemailer from "nodemailer";

// const sendEmail = async (options) => {
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: "Journal Portal <no-reply@journal.com>",
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     html: options.html,
//     attachments: options.attachments || [],
//   };

//   await transporter.sendMail(mailOptions);
// };

// export default sendEmail;









import { Resend } from "resend";
import fs from "fs";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {

    let attachments = [];

    if (options.attachments && options.attachments.length > 0) {
      attachments = options.attachments.map((file) => ({
        filename: file.filename,
        content: fs.readFileSync(file.path),
      }));
    }

    const response = await resend.emails.send({
      from: "Journal Portal <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
      attachments,
    });

    return response;

  } catch (error) {
    console.error("Email sending error:", error);
  }
};

export default sendEmail;