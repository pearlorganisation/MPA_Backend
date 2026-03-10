import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  // LOG 1: Check karein ki function call ho bhi raha hai ya nahi
  console.log("====== EMAIL FUNCTION STARTED ======");
  console.log("Sending email to:", options.email);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // LOG 2: Transporter ban gaya
    console.log("Transporter created successfully. Trying to send...");

    const mailOptions = {
      from: `"Journal Portal" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // LOG 3: Agar success hua toh ye dikhega
    console.log("====== EMAIL SENT SUCCESSFULLY! ======");
    console.log("Message ID:", info.messageId);

  } catch (error) {
    // LOG 4: Agar error aayi toh ye dikhega
    console.error("====== EMAIL FAILED! ======");
    console.error(error.message);
    console.error(error);
  }
};

export default sendEmail;