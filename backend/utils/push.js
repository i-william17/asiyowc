// utils/push.js
const { Expo } = require("expo-server-sdk");
const User = require("../models/User");

const expo = new Expo();

async function sendExpoPushToUser(user, { title, body, data = {} }) {
  try {
    if (!user) return;

    // ✅ Extract + dedupe tokens
    const tokens = Array.from(
      new Set(
        (user?.pushTokens || [])
          .map((t) => t?.token)
          .filter(Boolean)
      )
    );

    if (tokens.length === 0) return;

    // ✅ Keep only valid Expo tokens
    const validTokens = tokens.filter((t) =>
      Expo.isExpoPushToken(t)
    );

    if (validTokens.length === 0) return;

    const messages = validTokens.map((t) => ({
      to: t,
      sound: "default",
      title,
      body,
      data,
    }));

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        tickets.forEach(async (ticket, index) => {
          if (ticket.status === "error") {
            console.error("Push ticket error:", ticket.message);

            const failedToken = chunk[index]?.to;

            if (ticket.details?.error === "DeviceNotRegistered") {
              console.log("Removing invalid token:", failedToken);

              // 🔥 Remove invalid token from DB
              await User.updateOne(
                { _id: user._id },
                {
                  $pull: {
                    pushTokens: { token: failedToken },
                  },
                }
              );
            }
          }
        });
      } catch (err) {
        console.error("Expo chunk send error:", err);
      }
    }
  } catch (e) {
    console.error("sendExpoPushToUser ERROR:", e);
  }
}

module.exports = { sendExpoPushToUser };