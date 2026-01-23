import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    Modal,
    ScrollView,
} from "react-native";
import tw from "../../utils/tw";

/* =====================================================
   HAVERSINE DISTANCE (METERS)
===================================================== */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =====================================================
   FETCH FACILITIES (OSM OVERPASS)
===================================================== */
async function fetchFacilities(lat, lon) {
    const radius = 5000;

    const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](around:${radius},${lat},${lon});
      node["amenity"="hospital"](around:${radius},${lat},${lon});
    );
    out body;
  `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
            "User-Agent": "AsiyoApp/1.0 (safety@asiyo.app)",
        },
        body: query,
    });

    const text = await res.text();

    if (!res.ok || text.startsWith("<")) {
        console.warn("Overpass error:", text.slice(0, 200));
        return [];
    }

    const data = JSON.parse(text);
    if (!data.elements) return [];

    return data.elements.map((el) => ({
        id: el.id,
        name: el.tags?.name || "Unnamed Facility",
        type: el.tags?.amenity === "police" ? "police" : "hospital",
        latitude: el.lat,
        longitude: el.lon,
    }));
}

/* =====================================================
   SHARED HOOK WITH DEBOUNCE AND CACHE
===================================================== */
export function useFacilities(coords) {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cache for facilities with timestamp
    const cacheRef = useRef({ timestamp: 0, data: [], coords: null });
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    useEffect(() => {
        if (!coords) return;

        // Check cache first
        const now = Date.now();
        const { timestamp, data: cachedData, coords: cachedCoords } = cacheRef.current;

        // Cache is valid if:
        // 1. Within time window
        // 2. Same coordinates (or within 100m)
        const isCacheValid = (now - timestamp) < CACHE_DURATION &&
            cachedCoords &&
            getDistance(
                coords.latitude,
                coords.longitude,
                cachedCoords.latitude,
                cachedCoords.longitude
            ) < 100;

        if (isCacheValid) {
            setFacilities(cachedData);
            return;
        }

        // Debounced load
        const timeout = setTimeout(async () => {
            try {
                setLoading(true);

                const results = await fetchFacilities(
                    coords.latitude,
                    coords.longitude
                );

                const enriched = results
                    .map((f) => ({
                        ...f,
                        distance: getDistance(
                            coords.latitude,
                            coords.longitude,
                            f.latitude,
                            f.longitude
                        ),
                    }))
                    .sort((a, b) => a.distance - b.distance);

                // Update cache
                cacheRef.current = {
                    timestamp: now,
                    data: enriched,
                    coords
                };

                setFacilities(enriched);
            } catch (e) {
                console.error("Facilities fetch failed:", e);
            } finally {
                setLoading(false);
            }
        }, 800); // Debounce to avoid API hammering

        return () => clearTimeout(timeout);
    }, [coords]);

    return { facilities, loading };
}

/* =====================================================
   MAP RENDERER WITH MARKER MANAGEMENT
===================================================== */
export function renderFacilitiesOnMap(map, facilities, MarkerComponent) {
    if (!facilities?.length) return;

    if (Platform.OS === "web" && map) {
        const maplibregl = require("maplibre-gl");

        // Store markers in ref to manage duplicates
        if (!window.mapMarkersRef) {
            window.mapMarkersRef = [];
        }

        // Clear existing markers
        window.mapMarkersRef.forEach(marker => marker.remove());
        window.mapMarkersRef = [];

        facilities.forEach((f) => {
            const marker = new maplibregl.Marker({
                color: f.type === "police" ? "#0052CC" : "#DE350B",
            })
                .setLngLat([f.longitude, f.latitude])
                .setPopup(
                    new maplibregl.Popup().setHTML(
                        `<div style="padding: 8px; font-family: 'Poppins', sans-serif;">
              <div style="font-weight: 600; color: #172B4D; font-size: 13px;">${f.name}</div>
              <div style="color: #6B778C; font-size: 12px; margin-top: 2px;">${(f.distance / 1000).toFixed(2)} km</div>
            </div>`
                    )
                )
                .addTo(map);

            window.mapMarkersRef.push(marker);
        });
    }

    if (Platform.OS !== "web" && MarkerComponent) {
        return facilities.map((f) => (
            <MarkerComponent
                key={`${f.type}-${f.id}`} // Unique key across types
                coordinate={{
                    latitude: f.latitude,
                    longitude: f.longitude,
                }}
                title={f.name}
                description={`${(f.distance / 1000).toFixed(2)} km away`}
                pinColor={f.type === "police" ? "#0052CC" : "#DE350B"}
            />
        ));
    }
}

/* =====================================================
   LIST + SOS BUTTON
===================================================== */
export default function Facilities({ facilities = [], onSOS }) {
    const hospitals = facilities
        .filter((f) => f.type === "hospital")
        .slice(0, 4);

    const policeStations = facilities
        .filter((f) => f.type === "police")
        .slice(0, 4);

    /* SOS STATE */
    const holdTimer = useRef(null);
    const [holding, setHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showSOSPopup, setShowSOSPopup] = useState(false);
    const [emergencyNumbers, setEmergencyNumbers] = useState([]);

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (holdTimer.current) {
                clearInterval(holdTimer.current);
            }
        };
    }, []);

    // Load emergency numbers based on region (simplified)
    useEffect(() => {
        // In a real app, you'd fetch based on user's country
        const defaultNumbers = [
            { label: "Police", number: "911" },
            { label: "Ambulance", number: "911" },
            { label: "Fire Department", number: "911" }
        ];
        setEmergencyNumbers(defaultNumbers);
    }, []);

    const startHold = () => {
        setHolding(true);
        setProgress(0);

        const startTime = Date.now();
        const duration = 3000;

        holdTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(holdTimer.current);
                setHolding(false);
                setProgress(0);
                setShowSOSPopup(true);
                try {
                    onSOS?.();
                } catch (error) {
                    console.error("SOS activation failed:", error);
                    // Fallback: show emergency numbers if onSOS fails
                    setShowSOSPopup(true);
                }
            }
        }, 50);
    };

    const cancelHold = () => {
        if (holdTimer.current) {
            clearInterval(holdTimer.current);
        }
        setHolding(false);
        setProgress(0);
    };

    const closePopup = () => {
        setShowSOSPopup(false);
    };

    // Call emergency number (simulated)
    const callEmergencyNumber = (number) => {
        if (Platform.OS === 'web') {
            window.open(`tel:${number}`, '_blank');
        } else {
            // On native, you'd use Linking.openURL(`tel:${number}`)
            console.log(`Calling ${number}`);
            // For demo, just close the modal
            closePopup();
        }
    };

    return (
        <>
            <View style={tw`pt-2`}>
                {/* HEADER */}
                <View style={tw`mb-5`}>
                    <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 16, color: "#111827", marginBottom: 4 }}>
                        Nearby Emergency Services
                    </Text>
                    <View style={tw`h-px bg-gray-200`} />
                </View>

                {/* SERVICES LIST */}
                <ScrollView
                    style={tw`h-56`}
                    showsVerticalScrollIndicator={false}
                >
                    {/* MEDICAL SECTION */}
                    {hospitals.length > 0 && (
                        <View style={tw`mb-5`}>
                            <View style={tw`flex-row items-center mb-3`}>
                                <View style={tw`w-1.5 h-4 bg-red-500 mr-2.5`} />
                                <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#374151" }}>
                                    Medical Facilities
                                </Text>
                                <View style={tw`ml-auto px-2 py-1 bg-gray-100 rounded-full`}>
                                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#4B5563" }}>
                                        {hospitals.length}
                                    </Text>
                                </View>
                            </View>

                            {hospitals.map((f, index) => (
                                <View
                                    key={`${f.type}-${f.id}`} // Unique key
                                    style={tw`
                    pl-3.5 mb-2.5 
                    border-l ${index === hospitals.length - 1 ? 'border-gray-200' : 'border-gray-200'}
                  `}
                                >
                                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#111827" }}>
                                        {f.name}
                                    </Text>
                                    <View style={tw`flex-row items-center mt-1`}>
                                        <View style={tw`px-2 py-0.5 bg-blue-50 rounded`}>
                                            <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#1E40AF" }}>
                                                {(f.distance / 1000).toFixed(2)} km
                                            </Text>
                                        </View>
                                        <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280", marginLeft: 8 }}>
                                            {f.type === 'hospital' ? 'Hospital' : 'Medical'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* POLICE SECTION */}
                    {policeStations.length > 0 && (
                        <View style={tw`mb-6`}>
                            <View style={tw`flex-row items-center mb-3`}>
                                <View style={tw`w-1.5 h-4 bg-blue-500 mr-2.5`} />
                                <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#374151" }}>
                                    Police Stations
                                </Text>
                                <View style={tw`ml-auto px-2 py-1 bg-gray-100 rounded-full`}>
                                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#4B5563" }}>
                                        {policeStations.length}
                                    </Text>
                                </View>
                            </View>

                            {policeStations.map((f, index) => (
                                <View
                                    key={`${f.type}-${f.id}`} // Unique key
                                    style={tw`
                    pl-3.5 mb-2.5 
                    border-l ${index === policeStations.length - 1 ? 'border-gray-200' : 'border-gray-200'}
                  `}
                                >
                                    <Text style={{ fontFamily: "Poppins-Medium", fontSize: 14, color: "#111827" }}>
                                        {f.name}
                                    </Text>
                                    <View style={tw`flex-row items-center mt-1`}>
                                        <View style={tw`px-2 py-0.5 bg-blue-50 rounded`}>
                                            <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: "#1E40AF" }}>
                                                {(f.distance / 1000).toFixed(2)} km
                                            </Text>
                                        </View>
                                        <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#6B7280", marginLeft: 8 }}>
                                            Police
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                </ScrollView>
                {/* SAFETY NOTICE */}
                <View style={tw`px-4 py-3 bg-purple-50 border-t border-purple-100`}>
                    <Text
                        style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#374151", textAlign: "center" }}
                    >
                        This information is provided to help you find nearby emergency services. In case of an emergency, always prioritize your safety.
                    </Text>
                </View>
            </View>
        </>
    );
}