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
        members: userId,
      }).select("_id");

      if (!hub) {
        return cb?.({
          success: false,
          message: "Not a member or hub missing",
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
