const Mentor = require("../models/Mentor");

/* =====================================================
   HELPER → population config
===================================================== */
const populateUser = {
  path: "user",
  select: "profile.fullName profile.avatar",
};



/* =====================================================
   PUBLIC
===================================================== */

/* GET /api/mentors */
exports.getMentors = async (req, res) => {
  try {
    const { specialty, search } = req.query;

    const filter = {
      verified: true,
      isActive: true,
      isSuspended: false,
    };

    if (specialty) filter.specialty = specialty;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
      ];
    }

    const mentors = await Mentor.find(filter)
      .populate(populateUser)
      .sort({ rating: -1 });

    res.json(mentors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* GET /api/mentors/:id */
exports.getMentorById = async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id)
      .populate(populateUser);

    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* GET /api/mentors/:id/stories */
exports.getMentorStories = async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id)
      .populate(populateUser)
      .select("stories user");

    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    res.json(mentor.stories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =====================================================
   APPLY / PROFILE
===================================================== */

/* POST /api/mentors/apply */
/* ===================================================== */
exports.applyMentor = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      title,
      specialty,
      bio,
      skills,
      languages,
      experience,
      availability,
      pricePerSession,
      verificationDocs
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!name || !title || !specialty || !bio) {
      return res.status(400).json({
        message: "Name, title, specialty and bio are required",
      });
    }

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        message: "At least one skill is required",
      });
    }

    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({
        message: "At least one language is required",
      });
    }

    if (verificationDocs && verificationDocs.length > 5) {
      return res.status(400).json({
        message: "Maximum 5 verification documents allowed",
      });
    }

    /* ================= CHECK EXISTING ================= */

    const existingMentor = await Mentor.findOne({ user: userId });

    if (existingMentor) {

      if (
        existingMentor.verificationStatus === "pending" ||
        existingMentor.verificationStatus === "approved"
      ) {
        return res.status(400).json({
          message: "You have already applied as a mentor",
        });
      }

      /* ===== REAPPLY (REJECTED) ===== */

      if (existingMentor.verificationStatus === "rejected") {

        existingMentor.name = name;
        existingMentor.title = title;
        existingMentor.specialty = specialty;
        existingMentor.bio = bio;
        existingMentor.skills = skills;
        existingMentor.languages = languages;
        existingMentor.experience = experience || 0;

        existingMentor.pricePerSession = pricePerSession || 0;
        existingMentor.availability = availability || [];
        existingMentor.verificationDocs = verificationDocs || [];

        existingMentor.verificationStatus = "pending";
        existingMentor.verified = false;
        existingMentor.rejectionReason = null;

        await existingMentor.save();

        return res.json({
          message: "Mentor application resubmitted",
          mentor: existingMentor,
        });
      }
    }

    /* ================= CREATE NEW ================= */

    const mentor = await Mentor.create({
      user: userId,
      name,
      title,
      specialty,
      bio,
      skills,
      languages,
      experience: experience || 0,
      pricePerSession: pricePerSession || 0,
      availability: availability || [],
      verificationDocs: verificationDocs || [],
      verified: false,
      verificationStatus: "pending",
    });

    res.status(201).json({
      message: "Mentor application submitted successfully",
      mentor,
    });

  } catch (err) {
    console.error("Apply mentor error:", err);

    res.status(500).json({
      message: err.message
    });
  }
};

/* GET /api/mentors/me/profile */
exports.getMyMentorProfile = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id })
      .populate(populateUser);

    if (!mentor) return res.status(404).json({ message: "Mentor profile not found" });

    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* PUT /api/mentors/me/profile */
exports.updateMentorProfile = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id });

    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    Object.assign(mentor, req.body);

    await mentor.save();

    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =====================================================
   DOCUMENTS (URL ONLY)
===================================================== */

/* POST /api/mentors/me/docs */
exports.addVerificationDoc = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id });

    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    if (mentor.verificationDocs.length >= 5) {
      return res.status(400).json({ message: "Maximum 5 documents allowed" });
    }

    mentor.verificationDocs.push(req.body);

    await mentor.save();

    res.json(mentor.verificationDocs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* DELETE /api/mentors/me/docs/:index */
exports.removeVerificationDoc = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id });

    mentor.verificationDocs.splice(req.params.index, 1);

    await mentor.save();

    res.json(mentor.verificationDocs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =====================================================
   STORIES
===================================================== */

/* POST /api/mentors/me/stories */
/* =====================================================
   POST /api/mentors/me/stories
===================================================== */
exports.addStory = async (req, res) => {
  try {

    console.log("Incoming story payload:", req.body);

    const mentor = await Mentor.findOne({ user: req.user.id });

    if (!mentor) {
      return res.status(404).json({
        message: "Mentor profile not found",
      });
    }

    const { title, content, image } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    if (mentor.stories.length >= 10) {
      return res.status(400).json({
        message: "Maximum 10 stories allowed",
      });
    }

    const story = {
      title: title.trim(),
      content: content.trim(),
      image: image || "",
    };

    mentor.stories.push(story);

    await mentor.save();

    res.status(201).json({
      message: "Story added successfully",
      story: mentor.stories[mentor.stories.length - 1],
    });

  } catch (err) {
    console.error("Add story error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* PUT /api/mentors/me/stories/:storyId */
exports.updateStory = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id });

    const story = mentor.stories.id(req.params.storyId);

    Object.assign(story, req.body);

    await mentor.save();

    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* DELETE /api/mentors/me/stories/:storyId */
exports.deleteStory = async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.user.id });

    mentor.stories.id(req.params.storyId).deleteOne();

    await mentor.save();

    res.json({ message: "Story deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =====================================================
   ADMIN
===================================================== */

/* GET /api/mentors/admin/pending */
exports.getPendingMentors = async (req, res) => {
  const mentors = await Mentor.find({ verificationStatus: "pending" })
    .populate(populateUser);

  res.json(mentors);
};



/* PATCH approve */
exports.approveMentor = async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);

  mentor.verified = true;
  mentor.verificationStatus = "approved";

  await mentor.save();

  res.json({ message: "Mentor approved" });
};



/* PATCH reject */
exports.rejectMentor = async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);

  mentor.verified = false;
  mentor.verificationStatus = "rejected";
  mentor.rejectionReason = req.body.reason;

  await mentor.save();

  res.json({ message: "Mentor rejected" });
};



/* PATCH suspend */
exports.suspendMentor = async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);

  mentor.isSuspended = true;

  await mentor.save();

  res.json({ message: "Mentor suspended" });
};



/* PATCH activate */
exports.activateMentor = async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);

  mentor.isSuspended = false;

  await mentor.save();

  res.json({ message: "Mentor activated" });
};
