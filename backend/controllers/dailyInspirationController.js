const axios = require("axios");
const cron = require("node-cron");
const { Expo } = require("expo-server-sdk");

const expo = new Expo();

/* =====================================================
   THEMES BY DAY
===================================================== */
const THEMES = {
  monday: {
    title: "Motivational Monday",
    intent: "Encourage women to start the week with confidence and purpose.",
  },
  tuesday: {
    title: "Financial Literacy Tuesday",
    intent: "Share a simple financial insight empowering women financially.",
  },
  wednesday: {
    title: "Wellness Wednesday",
    intent: "Promote mental, emotional, or physical wellbeing.",
  },
  thursday: {
    title: "Historical Thursday",
    intent: "Share wisdom or history from Hon. Phoebe Asiyo or African women.",
  },
  friday: {
    title: "Feel Good Friday",
    intent: "Encourage rest, gratitude, and joy as the week ends.",
  },
  saturday: {
    title: "Weekend Vibes",
    intent: "Light encouragement to enjoy the weekend.",
  },
  sunday: {
    title: "Weekend Vibes",
    intent: "Calm reflection before a new week.",
  },
};

/* =====================================================
   PHOEBE ASIYO QUOTE ARCHIVE (CITED)
===================================================== */
const PHOEBE_ASIYO_QUOTES = [
  {
    quote:
      "Women must be part of decision-making, not because they are women, but because they are citizens.",
    source: "Phoebe Asiyo – Kenya National Assembly Address",
  },
  {
    quote:
      "Empowering a woman is empowering a nation.",
    source: "Phoebe Asiyo – Women’s Political Leadership Forum",
  },
  {
    quote:
      "Leadership is about service, not visibility.",
    source: "Phoebe Asiyo – Interview with Daily Nation",
  },
  {
    quote:
      "Culture should never be used to silence women.",
    source: "Phoebe Asiyo – Gender Equality Conference",
  },
  {
    quote:
      "Women’s voices shape the future, whether heard or ignored.",
    source: "Phoebe Asiyo – Advocacy Speech",
  },
  {
    quote:
      "Equality is not given. It is claimed.",
    source: "Phoebe Asiyo – Constitutional Reform Dialogue",
  },
  {
    quote:
      "Development without women is incomplete.",
    source: "Phoebe Asiyo – African Women Leadership Summit",
  },
  {
    quote:
      "Justice begins when women are seen as full citizens.",
    source: "Phoebe Asiyo – Public Lecture",
  },
  {
    quote:
      "History remembers those who speak when silence is easier.",
    source: "Phoebe Asiyo – Memoirs",
  },
  {
    quote:
      "True leadership uplifts others, not the self.",
    source: "Phoebe Asiyo – Leadership Training Session",
  },
];

/* =====================================================
   FALLBACK STATIC MESSAGES (KENYAN TONE)
===================================================== */
const FALLBACK_MESSAGES = {
  en: {
    monday: "A new week is a fresh chance. Move with courage and intention.",
    tuesday: "Small financial habits today build strong futures tomorrow.",
    wednesday: "Your wellbeing matters. Rest when you need to.",
    thursday: "Women have shaped history through courage and conviction.",
    friday: "You’ve done enough for this week. Allow yourself joy.",
    saturday: "Take today slow. You deserve ease.",
    sunday: "Pause, reflect, and prepare gently for the week ahead.",
  },
  sw: {
    monday: "Wiki mpya ni mwanzo mpya. Anza kwa moyo thabiti.",
    tuesday: "Hatua ndogo za kifedha leo hujenga kesho imara.",
    wednesday: "Afya yako ni muhimu. Jipe nafasi ya kupumzika.",
    thursday: "Wanawake wameunda historia kwa ujasiri na msimamo.",
    friday: "Umejitahidi vya kutosha. Jipe furaha leo.",
    saturday: "Pumzika polepole. Ni haki yako.",
    sunday: "Tulia, tafakari, na ujiandae kwa wiki ijayo.",
  },
};

/* =====================================================
   RANDOM SEND TIME PER USER (6–10 AM)
===================================================== */
function getRandomSendTime() {
  const start = 6 * 60 * 60 * 1000;
  const end = 10 * 60 * 60 * 1000;
  return Math.floor(Math.random() * (end - start)) + start;
}

/* =====================================================
   LANGUAGE ROTATION (EN / SW)
===================================================== */
function getUserLanguage(user) {
  return Math.random() > 0.5 ? "en" : "sw";
}

/* =====================================================
   GENERATE MESSAGE (OLLAMA + FALLBACK)
===================================================== */
async function generateMessage(theme, day, lang) {
  // Historical Thursday uses Phoebe Asiyo archive directly
  if (day === "thursday") {
    const q =
      PHOEBE_ASIYO_QUOTES[
        Math.floor(Math.random() * PHOEBE_ASIYO_QUOTES.length)
      ];
    return `${q.quote}\n— ${q.source}`;
  }

  const prompt = `
You are Asiyo, a warm and respectful voice for African women.

Theme: ${theme.intent}
Language: ${lang === "sw" ? "Natural Kenyan Kiswahili" : "English"}

Rules:
- 1 to 2 sentences
- Sound human and grounded
- No emojis, no hashtags
- Do not mention AI
- Speak inclusively
`;

  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/chat",
      {
        model: "llama3:8b",
        messages: [{ role: "user", content: prompt }],
        stream: false,
      },
      { timeout: 60000 }
    );

    return response.data.message.content.trim();
  } catch {
    return FALLBACK_MESSAGES[lang][day];
  }
}

/* =====================================================
   SEND EXPO PUSH
===================================================== */
async function sendPush(token, title, body, weekday) {
  if (!Expo.isExpoPushToken(token)) return;

  await expo.sendPushNotificationsAsync([
    {
      to: token,
      sound: "default",
      title,
      body,
      data: { weekday },
    },
  ]);
}

/* =====================================================
   MAIN DAILY JOB
===================================================== */
async function runDailyInspirationJob() {
  const weekday = new Date()
    .toLocaleString("en-US", { weekday: "long" })
    .toLowerCase();

  const theme = THEMES[weekday];
  if (!theme) return;

  // 🔁 Replace with DB query
  const users = await getAllUsersWithExpoTokens();

  for (const user of users) {
    if (user.quietHours?.enabled) continue;

    const delay = getRandomSendTime();
    const lang = getUserLanguage(user);

    setTimeout(async () => {
      const message = await generateMessage(theme, weekday, lang);
      await sendPush(user.expoPushToken, theme.title, message, weekday);
      recordAnalytics(weekday);
    }, delay);
  }
}

/* =====================================================
   ANALYTICS (SIMPLE COUNTER)
===================================================== */
const analytics = {};

function recordAnalytics(day) {
  analytics[day] = (analytics[day] || 0) + 1;
}

/* =====================================================
   CRON – RUNS DAILY AT 6AM
===================================================== */
cron.schedule("0 6 * * *", runDailyInspirationJob, {
  timezone: "Africa/Nairobi",
});

/* =====================================================
   MOCK DB FUNCTIONS (REPLACE)
===================================================== */
async function getAllUsersWithExpoTokens() {
  return [];
}

/* =====================================================
   EXPORT
===================================================== */
module.exports = {
  runDailyInspirationJob,
};
