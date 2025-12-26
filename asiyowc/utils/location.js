import * as Location from "expo-location";

/* ================= GET USER LOCATION ================= */
export const getUserLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return location.coords;
};

/* ================= REVERSE GEOCODE ================= */
export const getLocationDetails = async (coords) => {
  const result = await Location.reverseGeocodeAsync(coords);

  if (!result || !result.length) return null;

  return {
    country: result[0].country,
    city: result[0].city,
    region: result[0].region,
  };
};
