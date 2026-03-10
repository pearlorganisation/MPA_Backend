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
import dns from "dns"; // 👈 NAYA IMPORT: Node.js ka internal DNS module

// 👇 SABSE BADI FIX: Node.js ko globally force karna ki wo strictly IPv4 use kare (Render IPv6 issue bypass)
dns.setDefaultResultOrder("ipv4first");

const sendEmail = async (options) => {
  console.log("====== EMAIL FUNCTION STARTED ======");
  console.log("Sending email to:", options.email);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,            
      secure: true,         
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // 16-digit App Password hona zaroori hai
      },
      tls: {
        rejectUnauthorized: false // SSL/TLS bypass network error ke liye
      }
    });

    console.log("Transporter ready. Forcefully using DNS IPv4. Sending now...");

    const mailOptions = {
      from: `"Journal Portal" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ ====== EMAIL SENT SUCCESSFULLY! ======");
    console.log("Message ID:", info.messageId);

  } catch (error) {
    console.error("❌ ====== EMAIL FAILED! ======");
    console.error("Error Message:", error.message);
    throw error;
  }
};

export default sendEmail;