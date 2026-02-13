const express = require("express");
const router = express.Router();

const marketplaceController = require("../controllers/marketplaceController");
const { auth } = require("../middleware/auth");


/* =====================================================
   PRODUCTS
===================================================== */
router.post("/products", auth, marketplaceController.createProduct);
router.put("/products/:productId", auth, marketplaceController.updateProduct);
router.delete("/products/:productId", auth, marketplaceController.deleteProduct);
router.get("/products", marketplaceController.getAllProducts);
router.get("/products/me", auth, marketplaceController.getMyProducts);
router.get("/products/:productId", auth, marketplaceController.getProductById);
router.post("/products/:productId/favorite", auth, marketplaceController.toggleFavoriteProduct);
router.post("/products/checkout", auth, marketplaceController.createProductCheckout);
router.post("/products/checkout/complete", marketplaceController.completeProductPurchase);

/* =====================================================
   ORDERS
===================================================== */
router.get("/orders/me", auth, marketplaceController.getMyOrders);

/* =====================================================
   JOBS
===================================================== */
router.post("/jobs", auth, marketplaceController.createJob);
router.get("/jobs", marketplaceController.getAllJobs);
router.get("/jobs/:jobId", auth, marketplaceController.getJobById);
router.post("/jobs/:jobId/apply", auth, marketplaceController.applyForJob);


/* =====================================================
   FUNDING
===================================================== */
router.post("/funding", auth, marketplaceController.createFunding);
router.get("/funding", marketplaceController.getAllFunding);
router.post("/funding/:fundingId/apply", auth, marketplaceController.applyForFunding);


/* =====================================================
   SKILLS
===================================================== */
router.post("/skills", auth, marketplaceController.createSkill);
router.get("/skills", marketplaceController.getAllSkills);
router.post("/skills/:skillId/request", auth, marketplaceController.requestSkillExchange);
router.post("/skills/:skillId/request/:requestId/respond", auth, marketplaceController.respondToSkillRequest);


/* =====================================================
   GLOBAL
===================================================== */
router.get("/search", marketplaceController.searchMarketplace);
router.get("/stats", marketplaceController.getMarketplaceStats);


module.exports = router;
