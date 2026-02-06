const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
require('express-async-errors');
const dotenv = require('dotenv');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const postRoutes = require('./routes/posts.js');
const feedRoutes = require('./routes/feed.js');
const programRoutes = require('./routes/programs.js');
const savingsRoutes = require('./routes/savings.js');
const paymentRoutes = require('./routes/payments.js');
const communityRoutes = require('./routes/community.js');
const aiRoutes = require("./routes/ai.js");
const legacyRoutes = require('./routes/legacy.js');
const eventRoutes = require('./routes/events.js');
const wellnessRoutes = require('./routes/wellness.js');
// const marketplaceRoutes = require('./routes/marketplace.js');
const mentorRoutes = require('./routes/mentorship.js');
// const moderationRoutes = require('./routes/moderation.js');
// const uploadRoutes = require('./routes/upload.js');

// Middleware
const errorHandler = require('./middleware/errorHandler.js');
const { responseFormatter } = require('./middleware/responseFormatter.js');

// Socket handlers
// const { setupSocket } = require('./socket/index.js'); // ❗ KEPT COMMENTED

dotenv.config();

const app = express();

/* =====================================================
   TRUST PROXY (REQUIRED FOR CLOUDFLARE / RENDER)
===================================================== */
app.set("trust proxy", 1);

const server = http.createServer(app);

// 🔹 Existing Socket.IO instance (kept)
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🔹 NEW: initialize socket using existing io instance
// (does NOT replace commented setupSocket)
const initSocket = require('./socket/index.js');
initSocket(io);

/* =====================================================
   ALLOWED ORIGINS (VERY IMPORTANT)
===================================================== */
const allowedOrigins = [
  "http://localhost:19000",
  "http://localhost:8081",
  "http://192.168.1.112:5000",
  "http://192.168.1.112:8081",
  "https://www.asiyowc.com",
  "https://www.asiyowc.onrender.com",
  "https://thumbnails-delivers-really-mathematical.trycloudflare.com"
];

/* =====================================================
   CORS (MUST COME BEFORE HELMET)
===================================================== */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ REQUIRED for browser preflight
app.options("*", cors());


/* =====================================================
   SECURITY HEADERS (CSP FIXED FOR CHECKOUT)
===================================================== */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
  })
);

/* =====================================================
   STATIC FILES
===================================================== */
app.use("/assets", express.static(path.join(__dirname, "assets")));

/* =====================================================
   BODY PARSING
===================================================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =====================================================
   SANITIZATION & PERFORMANCE
===================================================== */
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

/* =====================================================
   RATE LIMITING (OPTIONS SAFE)
===================================================== */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: (req) => req.method === "OPTIONS",
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
});

app.use("/api/", limiter);

// Response formatter
app.use(responseFormatter);

// DB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {});
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/legacy', legacyRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/wellness', wellnessRoutes);
// app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/mentors', mentorRoutes);
// app.use('/api/moderation', moderationRoutes);
// app.use('/api/upload', uploadRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Home route-- Server running check
app.get('/', (req, res) => {
  res.send('Asiyo API is running...');
});

// Start Server
const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
  });
};

startServer();

module.exports = app;
