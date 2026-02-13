const mongoose = require("mongoose");
const Product = require("../models/Product");
const Job = require("../models/Job");
const Funding = require("../models/Funding");
const Skill = require("../models/Skill");
const Order = require("../models/Order");
const PaymentIntent = require("../models/PaymentIntent");
const { nanoid } = require("nanoid");
require("dotenv").config();

/* =====================================================
   COMMON HELPER FUNCTIONS
===================================================== */
const includesCI = (hay, needle) => {
    const a = (hay ?? "").toString().toLowerCase();
    const b = (needle ?? "").toString().toLowerCase();
    return a.includes(b);
};

const formatKES = (n) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "0";
    const s = Math.round(num).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/* =====================================================
   PRODUCTS SECTION
===================================================== */

/* =====================================================
   CREATE PRODUCT LISTING
===================================================== */
exports.createProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            description,
            price,
            category,
            images,
            location,
            condition = "new",
            quantity = 1,
            tags = [],
        } = req.body;

        // Validation
        if (!title || !description || !price || !category || !images || !location) {
            return res.status(400).json({
                message: "Missing required fields: title, description, price, category, images, location",
            });
        }

        if (price <= 0) {
            return res.status(400).json({ message: "Price must be greater than 0" });
        }

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        // Create product
        const product = await Product.create({
            title,
            description,
            price,
            category,
            images,
            seller: userId,
            sellerName: req.user.profile?.fullName || req.user.username || "Unknown",
            location,
            condition,
            quantity,
            tags: tags.filter(Boolean),
            status: "active",
        });

        // Populate seller info
        const populatedProduct = await Product.findById(product._id)
            .populate("seller", "profile.fullName profile.avatar.url username email")
            .lean();

        res.status(201).json({
            message: "Product listed successfully",
            product: populatedProduct,
        });
    } catch (err) {
        console.error("❌ createProduct error:", err);
        res.status(500).json({ message: "Failed to create product listing" });
    }
};

/* =====================================================
   UPDATE PRODUCT
===================================================== */
exports.updateProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const updateData = req.body;

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check ownership
        if (product.seller.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to update this product" });
        }

        // Don't allow updating certain fields
        delete updateData.seller;
        delete updateData.sellerName;
        delete updateData.rating;
        delete updateData.reviews;
        delete updateData.views;
        delete updateData.favoritesCount;

        // Update product
        Object.assign(product, updateData);
        product.updatedAt = new Date();

        await product.save();

        // Return updated product
        const updatedProduct = await Product.findById(productId)
            .populate("seller", "profile.fullName profile.avatar.url username email")
            .lean();

        res.json({
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (err) {
        console.error("❌ updateProduct error:", err);
        res.status(500).json({ message: "Failed to update product" });
    }
};

/* =====================================================
   DELETE PRODUCT
===================================================== */
exports.deleteProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check ownership
        if (product.seller.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to delete this product" });
        }

        // Soft delete by changing status
        product.status = "hidden";
        product.updatedAt = new Date();
        await product.save();

        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error("❌ deleteProduct error:", err);
        res.status(500).json({ message: "Failed to delete product" });
    }
};

/* =====================================================
   GET PRODUCT BY ID
===================================================== */
exports.getProductById = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        // Increment view count
        await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

        const product = await Product.findById(productId)
            .populate("seller", "profile.fullName profile.avatar.url username email rating")
            .lean();

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if user has favorited this product
        // Note: You might have a separate Favorite model
        const isFavorite = false; // Implement based on your Favorite model

        // Check if user is the seller
        const isSeller = product.seller._id.toString() === userId;

        res.json({
            product,
            isFavorite,
            isSeller,
            formattedPrice: `Ksh ${formatKES(product.price)}`,
        });
    } catch (err) {
        console.error("❌ getProductById error:", err);
        res.status(500).json({ message: "Failed to fetch product details" });
    }
};

/* =====================================================
   GET ALL PRODUCTS (WITH FILTERS) - UPDATED PAGINATION
===================================================== */
exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const query = { status: "active" };

        if (category) query.category = category;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Product.countDocuments(query),
        ]);

        res.json({
            data: products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasMore: skip + products.length < total,
            }
        });
    } catch {
        res.status(500).json({ message: "Failed to fetch products" });
    }
};

/* =====================================================
   GET MY PRODUCTS
===================================================== */
exports.getMyProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const query = { seller: req.user.id };

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Product.countDocuments(query),
        ]);

        res.json({
            data: products,
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasMore: skip + products.length < total,
        });
    } catch {
        res.status(500).json({ message: "Failed to fetch your products" });
    }
};

/* =====================================================
   TOGGLE PRODUCT FAVORITE
===================================================== */
exports.toggleFavoriteProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if already favorited (you need a Favorite model for this)
        // This is a simplified version - implement based on your Favorite model
        const isFavorite = false; // Get from Favorite model

        if (isFavorite) {
            // Remove favorite
            // await Favorite.deleteOne({ user: userId, product: productId });
            product.favoritesCount = Math.max(0, product.favoritesCount - 1);
        } else {
            // Add favorite
            // await Favorite.create({ user: userId, product: productId });
            product.favoritesCount += 1;
        }

        await product.save();

        res.json({
            message: isFavorite ? "Removed from favorites" : "Added to favorites",
            favoritesCount: product.favoritesCount,
        });
    } catch (err) {
        console.error("❌ toggleFavoriteProduct error:", err);
        res.status(500).json({ message: "Failed to update favorites" });
    }
};

/* =====================================================
   CREATE CHECKOUT (MULTI ITEM CART)
===================================================== */
exports.createProductCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;

        /*
          items: [
            { productId, quantity }
          ]
        */

        if (!items?.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let totalAmount = 0;
        const validatedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);

            if (!product || product.status !== "active") {
                return res.status(400).json({
                    message: `${item.productId} unavailable`,
                });
            }

            if (item.quantity > product.quantity) {
                return res.status(400).json({
                    message: `${product.title} only has ${product.quantity} left`,
                });
            }

            totalAmount += product.price * item.quantity;

            validatedItems.push({
                productId: product._id,
                title: product.title,
                quantity: item.quantity,
                unitPrice: product.price,
                seller: product.seller,
            });
        }

        /* =====================================================
           CREATE PAYMENT INTENT (FIXED)
        ===================================================== */

        const intentId = `pi_${nanoid(18)}`;

        const intent = await PaymentIntent.create({
            intentId,

            // ✅ REQUIRED ENUM
            purpose: "PRODUCT_PURCHASE",

            // ✅ REQUIRED CORE FIELDS
            userId,
            amount: totalAmount,
            currency: "KES",

            // ✅ REQUIRED FOR M-PESA
            paybillShortCode: process.env.MPESA_PAYBILL || "174379",
            accountReference: `ORDER_${intentId}`,

            // ✅ GOOD PRACTICE
            method: "MPESA",
            status: "PENDING",

            // metadata for order reconstruction
            metadata: {
                items: validatedItems,
            },
        });

        const redirectUrl =
            `${process.env.API_PUBLIC_BASE_URL}/api/payments/checkout/${intentId}`;

        res.json({
            intentId,
            redirectUrl,
            amount: totalAmount,
            items: validatedItems,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Checkout failed" });
    }
};

/* =====================================================
   COMPLETE PURCHASE + CREATE ORDER
===================================================== */
exports.completeProductPurchase = async (req, res) => {
    try {
        const { intentId, transactionId, amount } = req.body;

        const intent = await PaymentIntent.findOne({ intentId });

        if (!intent)
            return res.status(404).json({ message: "Payment intent not found" });

        if (intent.status !== "PENDING")
            return res.status(400).json({ message: "Already processed" });

        if (amount < intent.amount)
            return res.status(400).json({ message: "Insufficient amount" });

        const items = intent.metadata.items;

        /* =====================================================
           REDUCE STOCK
        ====================================================== */
        for (const item of items) {
            const product = await Product.findById(item.productId);

            product.quantity -= item.quantity;

            if (product.quantity <= 0) {
                product.quantity = 0;
                product.status = "sold";
            }

            await product.save();
        }

        /* =====================================================
           CREATE ORDER
        ====================================================== */
        const order = await Order.create({
            orderNumber: `ORD-${nanoid(8).toUpperCase()}`,
            buyer: intent.userId,
            items: items.map((i) => ({
                product: i.productId,
                title: i.title,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                subtotal: i.unitPrice * i.quantity,
                seller: i.seller,
            })),
            amount: intent.amount,
            paymentIntentId: intentId,
            transactionId,
            status: "paid",
        });

        /* =====================================================
           COMPLETE INTENT
        ====================================================== */
        intent.status = "COMPLETED";
        intent.transactionId = transactionId;
        intent.completedAt = new Date();
        await intent.save();

        res.json({
            message: "Purchase completed",
            orderId: order._id,
            orderNumber: order.orderNumber,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to complete purchase" });
    }
};

/* =====================================================
   GET MY ORDERS
===================================================== */
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id })
            .populate("items.product")
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

/* =====================================================
   JOBS SECTION
===================================================== */

/* =====================================================
   CREATE JOB LISTING
===================================================== */
exports.createJob = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            company,
            description,
            type,
            location,
            salary,
            requirements = [],
            skills = [],
            category,
            experienceLevel = "mid",
            applicationDeadline,
            contactEmail,
            isRemote = false,
            tags = [],
        } = req.body;

        // Validation
        if (!title || !company || !description || !type || !location || !salary || !category || !contactEmail) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        // Email validation
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(contactEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Create job
        const job = await Job.create({
            title,
            company,
            companyId: userId,
            description,
            type,
            location,
            salary,
            requirements: requirements.filter(Boolean),
            skills: skills.filter(Boolean),
            category,
            experienceLevel,
            applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
            contactEmail,
            postedBy: userId,
            isRemote,
            tags: tags.filter(Boolean),
            status: "active",
        });

        res.status(201).json({
            message: "Job listing created successfully",
            job,
        });
    } catch (err) {
        console.error("❌ createJob error:", err);
        res.status(500).json({ message: "Failed to create job listing" });
    }
};

/* =====================================================
   GET ALL JOBS - UPDATED PAGINATION
===================================================== */
exports.getAllJobs = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, search } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const query = { status: "active" };
        if (type) query.type = type;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } },
            ];
        }

        const [jobs, total] = await Promise.all([
            Job.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Job.countDocuments(query),
        ]);

        res.json({
            data: jobs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasMore: skip + jobs.length < total,
            }
        });
    } catch {
        res.status(500).json({ message: "Failed to fetch jobs" });
    }
};

/* =====================================================
   GET JOB BY ID
===================================================== */
exports.getJobById = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        // Increment view count
        await Job.findByIdAndUpdate(jobId, { $inc: { views: 1 } });

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Check if job is expired
        if (job.applicationDeadline && new Date() > job.applicationDeadline) {
            job.status = "expired";
            await Job.findByIdAndUpdate(jobId, { status: "expired" });
        }

        // Check if user is the poster
        const isPoster = job.postedBy.toString() === userId;

        res.json({
            job,
            isPoster,
        });
    } catch (err) {
        console.error("❌ getJobById error:", err);
        res.status(500).json({ message: "Failed to fetch job details" });
    }
};

/* =====================================================
   APPLY FOR JOB
===================================================== */
exports.applyForJob = async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        const { coverLetter, resume } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Check if job is active and not expired
        if (job.status !== "active") {
            return res.status(400).json({ message: "Job is no longer accepting applications" });
        }

        if (job.applicationDeadline && new Date() > job.applicationDeadline) {
            job.status = "expired";
            await job.save();
            return res.status(400).json({ message: "Application deadline has passed" });
        }

        // Check if already applied (you'd need to track applications in Job model)
        // For now, just increment count
        job.applicationCount += 1;
        await job.save();

        // TODO: Create application record, notify employer, etc.

        res.json({
            message: "Application submitted successfully",
            applicationCount: job.applicationCount,
        });
    } catch (err) {
        console.error("❌ applyForJob error:", err);
        res.status(500).json({ message: "Failed to submit application" });
    }
};

/* =====================================================
   FUNDING SECTION
===================================================== */

/* =====================================================
   CREATE FUNDING OPPORTUNITY
===================================================== */
exports.createFunding = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            provider,
            description,
            amount,
            type,
            category,
            eligibility,
            deadline,
            applicationProcess = [],
            focusAreas = [],
            requirements = [],
            contactEmail,
            website,
            tags = [],
        } = req.body;

        // Validation
        if (!title || !provider || !description || !amount || !type || !category || !deadline || !contactEmail) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        // Email validation
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(contactEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Create funding
        const funding = await Funding.create({
            title,
            provider,
            providerId: userId,
            description,
            amount,
            type,
            category,
            eligibility,
            deadline: new Date(deadline),
            applicationProcess: applicationProcess.filter(Boolean),
            focusAreas: focusAreas.filter(Boolean),
            requirements: requirements.filter(Boolean),
            contactEmail,
            website,
            tags: tags.filter(Boolean),
            status: "open",
        });

        res.status(201).json({
            message: "Funding opportunity created successfully",
            funding,
        });
    } catch (err) {
        console.error("❌ createFunding error:", err);
        res.status(500).json({ message: "Failed to create funding opportunity" });
    }
};

/* =====================================================
   GET ALL FUNDING OPPORTUNITIES - UPDATED PAGINATION
===================================================== */
exports.getAllFunding = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const query = {
            status: "open",
            deadline: { $gt: new Date() },
        };

        if (category) query.category = category;

        if (search) {
            query.title = { $regex: search, $options: "i" };
        }

        const [funding, total] = await Promise.all([
            Funding.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Funding.countDocuments(query),
        ]);

        res.json({
            data: funding,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasMore: skip + funding.length < total,
            }
        });
    } catch {
        res.status(500).json({ message: "Failed to fetch funding" });
    }
};

/* =====================================================
   APPLY FOR FUNDING
===================================================== */
exports.applyForFunding = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fundingId } = req.params;
        const { proposal, documents = [] } = req.body;

        const funding = await Funding.findById(fundingId);
        if (!funding) {
            return res.status(404).json({ message: "Funding opportunity not found" });
        }

        // Check if funding is open
        if (funding.status !== "open") {
            return res.status(400).json({ message: "Funding is no longer accepting applications" });
        }

        // Check deadline
        if (new Date() > funding.deadline) {
            funding.status = "closed";
            await funding.save();
            return res.status(400).json({ message: "Application deadline has passed" });
        }

        // Increment application count
        funding.applicationCount += 1;
        await funding.save();

        // TODO: Create application record with detailed information

        res.json({
            message: "Application submitted successfully",
            applicationCount: funding.applicationCount,
        });
    } catch (err) {
        console.error("❌ applyForFunding error:", err);
        res.status(500).json({ message: "Failed to submit application" });
    }
};

/* =====================================================
   SKILLS SECTION
===================================================== */

/* =====================================================
   CREATE SKILL LISTING
===================================================== */
exports.createSkill = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            skill,
            category,
            proficiency = "intermediate",
            offer,
            exchangeFor,
            about,
            location,
            remoteWork = true,
            portfolioLinks = [],
            experienceYears = 0,
            experienceDescription,
            availabilityStatus = "available",
            hoursPerWeek,
            languages = [],
            tags = [],
        } = req.body;

        // Validation
        if (!skill || !category || !offer || !exchangeFor || !location) {
            return res.status(400).json({
                message: "Missing required fields: skill, category, offer, exchangeFor, location",
            });
        }

        // Create skill listing
        const skillListing = await Skill.create({
            user: userId,
            userName: req.user.profile?.fullName || req.user.username || "Unknown",
            avatar: req.user.profile?.avatar?.url,
            skill,
            category,
            proficiency,
            offer,
            exchangeFor,
            about,
            location,
            remoteWork,
            portfolioLinks,
            experience: {
                years: experienceYears,
                description: experienceDescription,
            },
            availability: {
                status: availabilityStatus,
                hoursPerWeek,
            },
            languages,
            tags: tags.filter(Boolean),
            status: "active",
        });

        res.status(201).json({
            message: "Skill listing created successfully",
            skill: skillListing,
        });
    } catch (err) {
        console.error("❌ createSkill error:", err);
        res.status(500).json({ message: "Failed to create skill listing" });
    }
};

/* =====================================================
   GET ALL SKILLS - UPDATED PAGINATION
===================================================== */
exports.getAllSkills = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const query = { status: "active" };
        if (category) query.category = category;

        if (search) {
            query.skill = { $regex: search, $options: "i" };
        }

        const [skills, total] = await Promise.all([
            Skill.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Skill.countDocuments(query),
        ]);

        res.json({
            data: skills,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasMore: skip + skills.length < total,
            }
        });
    } catch {
        res.status(500).json({ message: "Failed to fetch skills" });
    }
};

/* =====================================================
   REQUEST SKILL EXCHANGE
===================================================== */
exports.requestSkillExchange = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skillId } = req.params;
        const { message, proposedExchange } = req.body;

        const skill = await Skill.findById(skillId);
        if (!skill) {
            return res.status(404).json({ message: "Skill listing not found" });
        }

        // Check if skill is active
        if (skill.status !== "active") {
            return res.status(400).json({ message: "Skill listing is not active" });
        }

        // Check if user is requesting their own skill
        if (skill.user.toString() === userId) {
            return res.status(400).json({ message: "Cannot request exchange with yourself" });
        }

        // Check if already requested
        const existingRequest = skill.requests.find(
            req => req.fromUser.toString() === userId && req.status === "pending"
        );
        if (existingRequest) {
            return res.status(400).json({ message: "You have already sent a request for this skill" });
        }

        // Add request
        skill.requests.push({
            fromUser: userId,
            message,
            proposedExchange,
            status: "pending",
            createdAt: new Date(),
        });

        // Update response rate
        const totalRequests = skill.requests.length;
        const respondedRequests = skill.requests.filter(
            req => req.status === "accepted" || req.status === "rejected" || req.status === "completed"
        ).length;

        skill.responseRate = totalRequests > 0 ? Math.round((respondedRequests / totalRequests) * 100) : 0;

        await skill.save();

        // TODO: Notify skill owner

        res.json({
            message: "Exchange request sent successfully",
            activeRequestsCount: skill.requests.filter(req => req.status === "pending").length,
        });
    } catch (err) {
        console.error("❌ requestSkillExchange error:", err);
        res.status(500).json({ message: "Failed to send exchange request" });
    }
};

/* =====================================================
   RESPOND TO SKILL EXCHANGE REQUEST
===================================================== */
exports.respondToSkillRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skillId, requestId } = req.params;
        const { response, message } = req.body; // response: 'accept' or 'reject'

        const skill = await Skill.findById(skillId);
        if (!skill) {
            return res.status(404).json({ message: "Skill listing not found" });
        }

        // Check ownership
        if (skill.user.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to respond to this request" });
        }

        // Find request
        const request = skill.requests.id(requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request already processed" });
        }

        // Update request status
        request.status = response === "accept" ? "accepted" : "rejected";
        request.updatedAt = new Date();

        // Update response rate
        skill.responseRate = skill.requests.length > 0
            ? Math.round((skill.requests.filter(req => req.status !== "pending").length / skill.requests.length) * 100)
            : 0;

        await skill.save();

        // TODO: Create chat thread if accepted, notify requester

        res.json({
            message: `Request ${response === 'accept' ? 'accepted' : 'rejected'} successfully`,
            status: request.status,
        });
    } catch (err) {
        console.error("❌ respondToSkillRequest error:", err);
        res.status(500).json({ message: "Failed to process request" });
    }
};

/* =====================================================
   SEARCH ACROSS ALL MARKETPLACE CATEGORIES
===================================================== */
exports.searchMarketplace = async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const skip = (pageNum - 1) * limitNum;

        const regex = new RegExp(query, "i");

        const [products, jobs] = await Promise.all([
            Product.find({ title: regex }).skip(skip).limit(limitNum).lean(),
            Job.find({ title: regex }).skip(skip).limit(limitNum).lean(),
        ]);

        res.json({
            products,
            jobs,
            page: pageNum,
            limit: limitNum,
        });
    } catch {
        res.status(500).json({ message: "Search failed" });
    }
};

/* =====================================================
   GET MARKETPLACE STATISTICS
===================================================== */
exports.getMarketplaceStats = async (req, res) => {
    try {
        const [productCount, jobCount, fundingCount, skillCount] = await Promise.all([
            Product.countDocuments({ status: "active" }),
            Job.countDocuments({ status: "active" }),
            Funding.countDocuments({ status: "open" }),
            Skill.countDocuments({ status: "active" }),
        ]);

        res.json({
            stats: {
                products: productCount,
                jobs: jobCount,
                funding: fundingCount,
                skills: skillCount,
                total: productCount + jobCount + fundingCount + skillCount,
            },
            updatedAt: new Date(),
        });
    } catch (err) {
        console.error("❌ getMarketplaceStats error:", err);
        res.status(500).json({ message: "Failed to fetch statistics" });
    }
};