// utils/voiceSounds.js
import { Audio } from "expo-av";

let joinSound;
let leaveSound;
let reconnectSound;

const LOW_VOLUME = 0.2; // 👈 subtle, Google-Meet-like

export async function loadVoiceSounds() {
  try {
    joinSound = new Audio.Sound();
    leaveSound = new Audio.Sound();
    reconnectSound = new Audio.Sound();

    await joinSound.loadAsync(
      require("../assets/sounds/join.mp3"),
      { shouldPlay: false, volume: LOW_VOLUME }
    );

    await leaveSound.loadAsync(
      require("../assets/sounds/leave.mp3"),
      { shouldPlay: false, volume: LOW_VOLUME }
    );

    await reconnectSound.loadAsync(
      require("../assets/sounds/reconnect.mp3"),
      { shouldPlay: false, volume: LOW_VOLUME }
    );

    // ✅ Extra safety (some platforms ignore load volume)
    await joinSound.setVolumeAsync(LOW_VOLUME);
    await leaveSound.setVolumeAsync(LOW_VOLUME);
    await reconnectSound.setVolumeAsync(LOW_VOLUME);

  } catch (e) {
    console.warn("[voice] sound load failed", e);
  }
}

export const playJoin = async () => {
  try {
    await joinSound?.replayAsync();
  } catch {}
};

export const playLeave = async () => {
  try {
    await leaveSound?.replayAsync();
  } catch {}
};

export const playReconnect = async () => {
  try {
    await reconnectSound?.replayAsync();
  } catch {}
};
