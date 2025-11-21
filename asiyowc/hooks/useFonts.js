import * as Font from "expo-font";
import { useState, useEffect } from "react";

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
          "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
          "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
          "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
          "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
          "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
        });

        setFontsLoaded(true);
      } catch (error) {
        console.error("Error loading fonts:", error);
        setFontError(error);
      }
    }

    loadFonts();
  }, []);

  return { fontsLoaded, fontError };
};
