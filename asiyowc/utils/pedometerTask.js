import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as SecureStore from "expo-secure-store";
import { Pedometer } from "expo-sensors";

export const STEP_TASK = "background-step-task";
const KEY = "DAILY_STEPS";

TaskManager.defineTask(STEP_TASK, async () => {
  try {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const result = await Pedometer.getStepCountAsync(start, end);

    // ✅ persist securely
    await SecureStore.setItemAsync(KEY, String(result.steps));

    return BackgroundFetch.BackgroundFetchResult.NewData;

  } catch (e) {
    console.log("STEP_TASK failed:", e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
