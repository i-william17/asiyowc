const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { viewCertificate } = require("../controllers/certificateController");

// This MUST match the URL structure saved in downloadUrl
router.get("/:certificateId", auth, viewCertificate);

module.exports = router;
