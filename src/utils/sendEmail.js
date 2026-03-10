import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
  console.log("Sending email to:", options.email);

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,

    },
  });

  const mailOptions = {
    from: "Journal Portal <no-reply@journal.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
  console.log("Email sent successfully ✅");
};

export default sendEmail;