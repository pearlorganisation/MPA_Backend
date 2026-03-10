import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // 'service: "Gmail"' ki jagah ye use karna zyada reliable hai
      port: 465, // SSL port
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // DHYAN RAHE: Yahan Gmail ka 'App Password' hona chahiye (16 digits)
      },
    });

    const mailOptions = {
      // From address me apna verified email hi use karein taaki spam me na jaye
      from: `"Journal Portal" <${process.env.EMAIL_USER}>`, 
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID: ", info.messageId); // Success log
    
  } catch (error) {
    // Ye log aapko Render dashboard pe batayega ki exact problem kya hai
    console.error("EMAIL SENDING FAILED: ", error.message); 
    console.error("FULL ERROR DETAILS: ", error);
  }
};

export default sendEmail;