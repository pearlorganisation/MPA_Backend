import Enquiry from "./enquiry.model.js";

// For Frontend: User sends a message
export const createEnquiry = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const newEnquiry = await Enquiry.create({ name, email, subject, message });
    res.status(201).json({ success: true, message: "Message sent successfully!", data: newEnquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

// For Admin: Get all messages
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }); // Newest first
    res.status(200).json({ success: true, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch enquiries." });
  }
};

// For Admin: Delete a message
export const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await Enquiry.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Enquiry deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete enquiry." });
  }
};