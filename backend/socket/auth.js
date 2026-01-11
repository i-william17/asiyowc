// socket/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (socket, next) => {
  try {
    // Client must connect with: io(URL, { auth: { token } })
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Unauthorized: missing token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id; // backward-safe

    if (!userId) return next(new Error("Unauthorized: invalid token"));

    const user = await User.findById(userId).select(
      "_id name avatar role"
    );

    if (!user) return next(new Error("Unauthorized: user not found"));

    socket.user = {
      id: String(user._id),
      _id: String(user._id), // ⭐ important
      name: user.name,
      avatar: user.avatar,
      role: user.role,

      // ⭐ keeps consistency with frontend message rendering
      profile: {
        fullName: user.name,
        avatar: user.avatar,
      },
    };

    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Unauthorized"));
  }
};
