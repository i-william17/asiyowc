import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const secureStore = {
  /* ============================================================
     BASIC STORAGE
  ============================================================ */
  async setItem(key, value) {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error saving to secure store:', error);
      return false;
    }
  },

  async getItem(key) {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Error reading from secure store:', error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      return true;
    } catch (error) {
      console.error('Error removing from secure store:', error);
      return false;
    }
  },

  async clear() {
    try {
      const keys = [
        "token",
        "onboarding",
        "hasRegistered",
        "enrolledPrograms"
      ];

      for (const key of keys) {
        if (isWeb) {
          localStorage.removeItem(key);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      }

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

  async getEnrolledPrograms() {
    try {
      const json = isWeb
        ? localStorage.getItem("enrolledPrograms")
        : await SecureStore.getItemAsync("enrolledPrograms");

      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error("Error loading enrolled programs:", error);
      return [];
    }
  },

  async saveEnrollment(programId) {
    try {
      const json = isWeb
        ? localStorage.getItem("enrolledPrograms")
        : await SecureStore.getItemAsync("enrolledPrograms");

      const arr = json ? JSON.parse(json) : [];

      if (!arr.includes(programId)) {
        arr.push(programId);
      }

      const updated = JSON.stringify(arr);

      if (isWeb) {
        localStorage.setItem("enrolledPrograms", updated);
      } else {
        await SecureStore.setItemAsync("enrolledPrograms", updated);
      }

      return true;
    } catch (error) {
      console.error("Error saving enrollment:", error);
      return false;
    }
  },

  async removeEnrollment(programId) {
    try {
      const json = isWeb
        ? localStorage.getItem("enrolledPrograms")
        : await SecureStore.getItemAsync("enrolledPrograms");

      const arr = json ? JSON.parse(json) : [];
      const updated = arr.filter(id => id !== programId);

      const str = JSON.stringify(updated);

      if (isWeb) {
        localStorage.setItem("enrolledPrograms", str);
      } else {
        await SecureStore.setItemAsync("enrolledPrograms", str);
      }

      return true;
    } catch (error) {
      console.error("Error removing enrollment:", error);
      return false;
    }
  },
};
