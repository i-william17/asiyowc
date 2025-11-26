import * as SecureStore from 'expo-secure-store';

export const secureStore = {
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
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('onboarding');
      await SecureStore.deleteItemAsync('hasRegistered');
      return true;
    } catch (error) {
      console.error('Error clearing secure store:', error);
      return false;
    }
  },
};
