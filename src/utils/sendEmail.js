import nodemailer from "nodemailer";

const sendEmail = async (options) => {
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

    const mailOptions = {
      from: `"Journal Portal" <${process.env.EMAIL_USER}>`, 
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID: ", info.messageId); // Success log
    
  } catch (error) {
   
    console.error("EMAIL SENDING FAILED: ", error.message); 
    console.error("FULL ERROR DETAILS: ", error);
  }
};

export default sendEmail;