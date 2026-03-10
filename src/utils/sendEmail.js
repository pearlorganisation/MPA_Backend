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

const sendEmail = async (options) => {
  console.log("====== EMAIL FUNCTION STARTED ======");
  console.log("Sending email to:", options.email);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,            // Port 465 hi chalne dete hain
      secure: true,         // 465 ke liye secure "true" hona chahiye
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Dhyan rahe, ye 16-digit App Password ho
      },
      // 👇 RENDER FIX 1: Zabardasti IPv4 use karne ke liye (ENETUNREACH error solve karega)
      family: 4, 
      
      // 👇 RENDER FIX 2: SSL Certificate validation bypass (Network error bachane ke liye)
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log("Transporter ready. Forcefully using IPv4. Sending now...");

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
    throw error; // Isko throw karna mat bhulna, warna Controller ko lagega mail chala gaya
  }
};

export default sendEmail;