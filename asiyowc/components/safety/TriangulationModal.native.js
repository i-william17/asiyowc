import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import { X, LocateFixed } from "lucide-react-native";
import tw from "../../utils/tw";
import { getUserLocation } from "../../utils/location";
import ShimmerLoader from "../ui/ShimmerLoader";

import Facilities, {
  useFacilities,
  renderFacilitiesOnMap,
} from "../../components/safety/Facilities";

/* Fallback (Nairobi CBD) */
const FALLBACK_REGION = {
  latitude: -1.286389,
  longitude: 36.817223,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function TriangulationModal({ visible, onClose }) {
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);

  /* 🔑 Facilities come ONLY from the hook */
  const { facilities, loading: facilitiesLoading } =
    useFacilities(region);

  /* =====================================================
     FETCH LOCATION
  ===================================================== */
  const locateUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const location = await getUserLocation();

      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setAccuracy(location.accuracy || 30);
    } catch (err) {
      setError(
        "Unable to access your location. Please allow location access."
      );
      setRegion(FALLBACK_REGION);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     AUTO LOCATE ON OPEN
  ===================================================== */
  useEffect(() => {
    if (visible) {
      locateUser();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={tw`flex-1 bg-black/40 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl p-4 h-[90%]`}>
          {/* HEADER */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 18,
              }}
            >
              Locating Nearby Help
            </Text>

            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {/* LOCATION LOADING */}
          {loading && (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color="#6A1B9A" />
              <Text style={[tw`mt-3`, { fontFamily: "Poppins-Regular" }]}>
                Triangulating your location…
              </Text>
            </View>
          )}

          {/* MAP + FACILITIES */}
          {!loading && region && (
            <View style={tw`flex-1`}>
              {/* MAP */}
              <MapView
                style={tw`h-64 rounded-xl`}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                zoomControlEnabled
                rotateEnabled
                pitchEnabled
              >
                <Marker coordinate={region} title="You are here" pinColor="#6A1B9A" />

                {accuracy && (
                  <Circle
                    center={region}
                    radius={accuracy}
                    strokeColor="rgba(106,27,154,0.4)"
                    fillColor="rgba(106,27,154,0.15)"
                  />
                )}

                {renderFacilitiesOnMap(null, facilities, Marker)}
              </MapView>

              {/* 🔥 CENTER SHIMMER OVERLAY */}
              {facilitiesLoading && (
                <View
                  style={tw`
          absolute inset-0
          items-center justify-center
          bg-white/80
        `}
                >
                  <ShimmerLoader width={220} height={20} className="mt-3" />

                </View>
              )}

              {/* FACILITIES LIST */}
              {!facilitiesLoading && facilities.length > 0 && (
                <Facilities facilities={facilities} />
              )}

              {!facilitiesLoading && facilities.length === 0 && (
                <View style={tw`mt-6 items-center`}>
                  <Text style={[tw`text-sm text-gray-500`, { fontFamily: "Poppins-Regular" }]}>
                    No nearby emergency facilities found.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ERROR + RETRY */}
          {!loading && error && (
            <View style={tw`mt-4 items-center`}>
              <Text
                style={[tw`text-red-600 text-sm text-center mb-2`, { fontFamily: "Poppins-Regular" }]}
              >
                {error}
              </Text>

              <TouchableOpacity
                onPress={locateUser}
                style={tw`border border-purple-700 px-4 py-2 rounded-full flex-row items-center`}
              >
                <LocateFixed size={16} color="#6A1B9A" />
                <Text
                  style={[tw`ml-2 text-purple-700`, { fontFamily: "Poppins-Medium" }]}
                >
                  Retry Location
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}