import * as SecureStore from 'expo-secure-store';

export const secureStore = {
  /* ============================================================
     BASIC STORAGE
  ============================================================ */
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error('Error saving to secure store:', error);
      return false;
    }
  },

  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error reading from secure store:', error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error('Error removing from secure store:', error);
      return false;
    }
  },

  async clear() {
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("onboarding");
      await SecureStore.deleteItemAsync("hasRegistered");
      await SecureStore.deleteItemAsync("enrolledPrograms");
      return true;
    } catch (error) {
      console.error("Error clearing secure store:", error);
      return false;
    }
  },

  /* ============================================================
     ENROLLMENT PERSISTENCE
     Used by Redux programSlice
  ============================================================ */

  // Load saved enrolled program IDs
  async getEnrolledPrograms() {
    try {
      const json = await SecureStore.getItemAsync("enrolledPrograms");
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error("Error loading enrolled programs:", error);
      return [];
    }
  },

  // Save a newly enrolled program
  async saveEnrollment(programId) {
    try {
      const json = await SecureStore.getItemAsync("enrolledPrograms");
      const arr = json ? JSON.parse(json) : [];

      if (!arr.includes(programId)) {
        arr.push(programId);
      }

      await SecureStore.setItemAsync(
        "enrolledPrograms",
        JSON.stringify(arr)
      );

      return true;
    } catch (error) {
      console.error("Error saving enrollment:", error);
      return false;
    }
  },

  // Remove a program from enrollment list
  async removeEnrollment(programId) {
    try {
      const json = await SecureStore.getItemAsync("enrolledPrograms");
      const arr = json ? JSON.parse(json) : [];

      const updated = arr.filter((id) => id !== programId);

      await SecureStore.setItemAsync(
        "enrolledPrograms",
        JSON.stringify(updated)
      );

      return true;
    } catch (error) {
      console.error("Error removing enrollment:", error);
      return false;
    }
  },
};
