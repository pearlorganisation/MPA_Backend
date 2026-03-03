import Editorial from "./editorial.model.js";

/* ================= CREATE ================= */
export const createEditorial = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const editorial = await Editorial.create({
      type: req.body.type,
      name: req.body.name,
      role: req.body.role,
      email: req.body.email,
      linkedin: req.body.linkedin,

      bio: req.body.bio,
      institution: req.body.institution,
      interests: req.body.interests,
      initials: req.body.initials,
      profileLink: req.body.profileLink,

      image: req.file ? req.file.path : null,
    });

    res.status(201).json({
      success: true,
      data: editorial,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET ================= */
export const getEditorials = async (req, res) => {
  try {
    const editorials = await Editorial.find({
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: editorials,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= UPDATE ================= */
export const updateEditorial = async (req, res) => {
  try {
    // Yahan saari fields add ki gayi hain jo model mein hain
    const updateData = {
      type: req.body.type,
      name: req.body.name,
      role: req.body.role,
      bio: req.body.bio,
      email: req.body.email,
      linkedin: req.body.linkedin,
      institution: req.body.institution,
      interests: req.body.interests,
      initials: req.body.initials,
      profileLink: req.body.profileLink,
    };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const data = await Editorial.findByIdAndUpdate(
      req.params.id,
      updateData,
      // runValidators: true add kiya hai taaki model ke required validation rules update par bhi kaam karein
      { new: true, runValidators: true } 
    );

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DELETE ================= */
export const deleteEditorial = async (req, res) => {
  try {
    await Editorial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET TOP LEADERS ================= */
export const getTopLeaders = async (req, res) => {
  try {
    const data = await Editorial.find({
      type: "topLeader",
      isActive: true,
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};