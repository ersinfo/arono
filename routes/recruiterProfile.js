const express = require("express");
const RecruiterProfile = require("../models/RecruiterProfile");

const router = express.Router();

// GET /api/recruiter/profile/me
router.get("/me", async (req, res) => {
  const recruiterId = req.headers["x-recruiter-id"];

  if (!recruiterId) {
    return res.status(400).json({ error: "Recruiter ID not provided" });
  }

  try {
    const profile = await RecruiterProfile.findOne({ user: recruiterId });

    if (!profile) {
      return res.status(404).json({ error: "Recruiter profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
