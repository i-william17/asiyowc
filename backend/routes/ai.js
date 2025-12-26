const express = require("express");
const { chatWithAi } = require("../controllers/aiController");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/chat", auth, chatWithAi);

module.exports = router;
