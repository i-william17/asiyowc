/* =====================================================
   HUB SOCKET HANDLERS (CLEAN + SAFE)
   ONLY:
   - join
   - leave
   - presence
   Business logic lives in controllers
===================================================== */

const mongoose = require("mongoose");
const Hub = require("../models/Hub");
const { isOnline } = require("./presence");

/* =====================================================
   HELPERS
===================================================== */

const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id || v.id || v.userId || "");
  return null;
};

const isValidId = (v) => mongoose.Types.ObjectId.isValid(v);

/* =====================================================
   EXPORT
===================================================== */

module.exports = (io, socket) => {
  const userId = normalizeId(socket.user?.id);
  if (!isValidId(userId)) return;

  /* =====================================================
     JOIN HUB ROOM
  ===================================================== */
  socket.on("hub:join", async ({ hubId }, cb) => {
    try {
      const hid = normalizeId(hubId);
      if (!isValidId(hid)) {
        return cb?.({ success: false, message: "Invalid hubId" });
      }

      const hub = await Hub.findOne({
        _id: hid,
        isRemoved: false,
        $or: [
          { members: userId },
          { moderators: userId },
        ],
      }).select("_id");

      if (!hub) {
        return cb?.({
          success: false,
          message: "Not allowed (not a member/moderator) or hub missing",
        });
      }

      socket.join(`hub:${hid}`);
      cb?.({ success: true });
    } catch (e) {
      console.error("hub:join error", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     HUB UPDATE REACTIONS (REALTIME)
     - Anyone in hub can react
     - 1 user = 1 emoji at a time
     - Toggle supported
  ===================================================== */
  socket.on("hub:update:reaction", async ({ hubId, updateId, emoji }, cb) => {
    try {
      const hid = normalizeId(hubId);
      const uid = normalizeId(updateId);

      if (!isValidId(hid) || !isValidId(uid)) {
        return cb?.({ success: false, message: "Invalid IDs" });
      }

      const cleanEmoji =
        typeof emoji === "string" && emoji.trim()
          ? emoji.trim()
          : null;

      const hub = await Hub.findOne({
        _id: hid,
        isRemoved: false,
        "updates._id": uid,
        $or: [
          { members: userId },
          { moderators: userId },
        ],
      });

      if (!hub) {
        return cb?.({ success: false, message: "Hub or update not found" });
      }

      const update = hub.updates.id(uid);
      if (!update) {
        return cb?.({ success: false, message: "Update not found" });
      }

      // Ensure reactions array exists
      update.reactions = Array.isArray(update.reactions)
        ? update.reactions
        : [];

      /* =====================================================
         CHECK EXISTING USER REACTION
      ===================================================== */
      const existingBucket = update.reactions.find((bucket) =>
        (bucket.users || []).some(
          (u) => String(u) === String(userId)
        )
      );

      const alreadySame =
        existingBucket && existingBucket.emoji === cleanEmoji;

      /* =====================================================
         1️⃣ REMOVE USER FROM ALL EMOJI BUCKETS
      ===================================================== */
      update.reactions.forEach((bucket) => {
        bucket.users = (bucket.users || []).filter(
          (u) => String(u) !== String(userId)
        );
        bucket.count = bucket.users.length;
      });

      // Remove empty buckets
      update.reactions = update.reactions.filter(
        (bucket) => bucket.users.length > 0
      );

      // 🔥 CRITICAL: Tell mongoose nested path changed
      hub.markModified("updates");

      /* =====================================================
         2️⃣ IF SAME EMOJI TAPPED → PURE REMOVE
      ===================================================== */
      if (alreadySame) {
        await hub.save();

        io.to(`hub:${hid}`).emit("hub:update:reaction", {
          hubId: hid,
          updateId: uid,
          reactions: update.reactions,
        });

        return cb?.({
          success: true,
          removed: true,
          reactions: update.reactions,
        });
      }

      /* =====================================================
         3️⃣ OTHERWISE ADD NEW EMOJI
      ===================================================== */
      if (cleanEmoji) {
        let bucket = update.reactions.find(
          (b) => b.emoji === cleanEmoji
        );

        if (!bucket) {
          update.reactions.push({
            emoji: cleanEmoji,
            users: [userId],
            count: 1,
          });
        } else {
          bucket.users.push(userId);
          bucket.count = bucket.users.length;
        }

        // 🔥 Mark again because we changed nested arrays
        hub.markModified("updates");
      }

      await hub.save();

      io.to(`hub:${hid}`).emit("hub:update:reaction", {
        hubId: hid,
        updateId: uid,
        reactions: update.reactions,
      });

      return cb?.({
        success: true,
        removed: false,
        reactions: update.reactions,
      });

    } catch (e) {
      console.error("hub:update:reaction error", e);
      return cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
   HUB UPDATE PIN / UNPIN (MODERATOR ONLY)
===================================================== */
  /* =====================================================
     HUB UPDATE PIN / UNPIN (MODERATOR ONLY)
  ===================================================== */
  socket.on("hub:update:pin", async ({ hubId, updateId }, cb) => {
    try {
      const hid = normalizeId(hubId);
      const uid = normalizeId(updateId);

      if (!isValidId(hid) || !isValidId(uid)) {
        return cb?.({ success: false, message: "Invalid IDs" });
      }

      const hub = await Hub.findOne({
        _id: hid,
        isRemoved: false,
        moderators: userId, // 🔥 ONLY moderator required
        "updates._id": uid,
      });

      if (!hub) {
        return cb?.({
          success: false,
          message: "Hub not found or not authorized",
        });
      }

      /* ================= TOGGLE ================= */
      const alreadyPinned =
        String(hub.pinnedUpdate) === String(uid);

      hub.pinnedUpdate = alreadyPinned ? null : uid;

      hub.markModified("pinnedUpdate");

      await hub.save();

      /* ================= POPULATE PIN ================= */
      let populatedPinned = null;

      if (hub.pinnedUpdate) {
        const update = hub.updates.id(hub.pinnedUpdate);

        if (update) {
          const author = await mongoose
            .model("User")
            .findById(update.author)
            .select("_id profile.fullName profile.avatar");

          populatedPinned = {
            ...update.toObject(),
            author,
          };
        }
      }

      /* ================= EMIT ================= */
      io.to(`hub:${hid}`).emit("hub:update:pin", {
        hubId: hid,
        pinnedUpdate: populatedPinned,
      });

      return cb?.({
        success: true,
        pinnedUpdate: populatedPinned,
      });

    } catch (e) {
      console.error("hub:update:pin error", e);
      return cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
   HUB UPDATE DELETE (MODERATOR ONLY)
===================================================== */
  socket.on("hub:update:delete", async ({ hubId, updateId }, cb) => {
    try {
      const hid = normalizeId(hubId);
      const uid = normalizeId(updateId);

      if (!isValidId(hid) || !isValidId(uid)) {
        return cb?.({ success: false, message: "Invalid IDs" });
      }

      const hub = await Hub.findOne({
        _id: hid,
        isRemoved: false,
        moderators: userId, // 🔥 ONLY moderator required
        "updates._id": uid,
      });

      if (!hub) {
        return cb?.({
          success: false,
          message: "Hub not found or not authorized",
        });
      }

      const update = hub.updates.id(uid);

      if (!update) {
        return cb?.({
          success: false,
          message: "Update not found",
        });
      }

      /* =====================================================
         CLOUDINARY CLEANUP (if image or video)
      ===================================================== */
      if (
        (update.type === "image" || update.type === "video") &&
        update.content?.publicId
      ) {
        try {
          const cloudinary = require("cloudinary").v2;

          await cloudinary.uploader.destroy(update.content.publicId, {
            resource_type: update.type === "video" ? "video" : "image",
          });
        } catch (err) {
          console.error("Cloudinary cleanup failed:", err.message);
        }
      }

      /* =====================================================
         REMOVE UPDATE FROM ARRAY
      ===================================================== */
      update.deleteOne();

      /* =====================================================
         CLEAR PIN IF THIS WAS PINNED
      ===================================================== */
      if (String(hub.pinnedUpdate) === String(uid)) {
        hub.pinnedUpdate = null;
        hub.markModified("pinnedUpdate");
      }

      hub.markModified("updates");

      await hub.save();

      /* =====================================================
         BROADCAST DELETE
      ===================================================== */
      io.to(`hub:${hid}`).emit("hub:update:delete", {
        hubId: hid,
        updateId: uid,
      });

      return cb?.({
        success: true,
        updateId: uid,
      });

    } catch (e) {
      console.error("hub:update:delete error", e);
      return cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     LEAVE HUB
  ===================================================== */
  socket.on("hub:leave", ({ hubId }) => {
    const hid = normalizeId(hubId);
    if (!isValidId(hid)) return;

    socket.leave(`hub:${hid}`);
  });

  /* =====================================================
     PRESENCE WHOIS
  ===================================================== */
  socket.on("hub:presence:whois", async ({ hubId }, cb) => {
    try {
      const hid = normalizeId(hubId);
      if (!isValidId(hid)) return;

      const hub = await Hub.findById(hid).select("members");
      if (!hub) return;

      const online = hub.members
        .map((m) => normalizeId(m))
        .filter(Boolean)
        .filter((uid) => isOnline(uid))
        .filter((uid) => uid !== userId);

      cb?.({
        success: true,
        data: online.map((uid) => ({ userId: uid })),
      });
    } catch (e) {
      console.error("hub:presence:whois error", e);
      cb?.({ success: false, message: e.message });
    }
  });
};
