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
//   };

//   await transporter.sendMail(mailOptions);
// };

// export default sendEmail;








import nodemailer from "nodemailer";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const sendEmail = async (options) => {
  console.log("====== EMAIL FUNCTION STARTED ======");
  console.log("Sending email to:", options.email);

  try {

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });

    // SMTP connection test
    await transporter.verify();
    console.log("✅ SMTP Connection Successful");

    const mailOptions = {
      from: `"Journal Portal" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ EMAIL SENT:", info.messageId);

  } catch (error) {
    console.error("❌ EMAIL FAILED:", error);
    throw error;
  }
};

export default sendEmail;