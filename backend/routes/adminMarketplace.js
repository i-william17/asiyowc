const express = require("express");
const router = express.Router();

const adminMarketplaceController = require("../controllers/adminMarketplaceController");
const { auth, isAdmin } = require("../middleware/auth");

// ✅ protect: admin/moderator only
router.use(auth, isAdmin);

// Reports
router.get("/reports/overview", adminMarketplaceController.overview);

// CRUD
router.get("/:entity", adminMarketplaceController.list);
router.post("/:entity", adminMarketplaceController.create);

router.get("/:entity/:id", adminMarketplaceController.getById);
router.put("/:entity/:id", adminMarketplaceController.update);
router.delete("/:entity/:id", adminMarketplaceController.remove);

module.exports = router;
