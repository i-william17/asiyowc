const cron = require("node-cron");
const Voice = require("../models/Voice");
const User = require("../models/User");
const { sendExpoPushToUser } = require("./push");

const runVoiceReminderCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const voices = await Voice.find({
        isRemoved: false,
      })
        .populate("host", "profile.fullName")
        .populate("group", "members")
        .populate("hub", "members");

      for (const voice of voices) {
        let modified = false;

        for (const instance of voice.instances) {
          const startsAt = new Date(instance.startsAt);

          const tenMinBefore = new Date(
            startsAt.getTime() - 10 * 60 * 1000
          );

          const hostName =
            voice.host?.profile?.fullName || "Host";

          let recipients = [];

          if (voice.group?.members?.length) {
            recipients.push(
              ...voice.group.members.map((m) =>
                String(m.user || m)
              )
            );
          }

          if (voice.hub?.members?.length) {
            recipients.push(
              ...voice.hub.members.map(String)
            );
          }

          recipients = [...new Set(recipients)].filter(
            (id) => id !== String(voice.host?._id)
          );

          /* =====================================
             1️⃣ 10 MINUTE REMINDER
          ===================================== */
          if (
            !instance.tenMinReminderSent &&
            now >= tenMinBefore &&
            now < startsAt
          ) {
            for (const uid of recipients) {
              const recipient = await User.findById(uid)
                .select("pushTokens")
                .lean();

              if (!recipient) continue;

              await sendExpoPushToUser(recipient, {
                title: voice.title,
                body: `${hostName} voice starts in 10 minutes`,
                data: {
                  type: "voice",
                  voiceId: String(voice._id),
                  instanceId: String(instance.instanceId),
                },
              });
            }

            instance.tenMinReminderSent = true;
            modified = true;
          }

          /* =====================================
             2️⃣ LIVE NOW PUSH (AT EXACT START)
          ===================================== */
          if (
            !instance.liveNowSent &&
            now >= startsAt
          ) {
            for (const uid of recipients) {
              const recipient = await User.findById(uid)
                .select("pushTokens")
                .lean();

              if (!recipient) continue;

              await sendExpoPushToUser(recipient, {
                title: voice.title,
                body: `${hostName} is live now`,
                data: {
                  type: "voice",
                  voiceId: String(voice._id),
                  instanceId: String(instance.instanceId),
                },
              });
            }

            instance.liveNowSent = true;
            modified = true;
          }
        }

        if (modified) {
          await voice.save();
        }
      }

    } catch (err) {
      console.error("Voice reminder cron error:", err);
    }
  });
};

module.exports = runVoiceReminderCron;