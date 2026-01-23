import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X } from "lucide-react-native";
import tw from "../../utils/tw";
import ShimmerLoader from "../ui/ShimmerLoader";

/* ✅ IMPORT YOUR FACILITIES MODULE */
import Facilities, {
    useFacilities,
    renderFacilitiesOnMap,
} from "../../components/safety/Facilities";

const MAP_CONTAINER_ID = "triangulation-map";

/* Nairobi fallback */
const DEFAULT_CENTER = {
    lat: -1.286389,
    lng: 36.817223,
};

export default function TriangulationModal({ visible, onClose }) {
    const mapRef = useRef(null);
    const hasResolvedLocation = useRef(false);
    const hasFetchedFacilities = useRef(false);

    const [coords, setCoords] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /* =====================================================
       ✅ SAFE MAP DESTROY FUNCTION (DEFINED INSIDE COMPONENT)
    ===================================================== */
    const safeDestroyMap = () => {
        try {
            if (mapRef.current) {
                // Remove all event listeners first
                mapRef.current.off?.();
                if (typeof mapRef.current.remove === "function") {
                    mapRef.current.remove();
                }
                mapRef.current = null;
            }
        } catch (e) {
            console.warn("Map cleanup skipped:", e);
            mapRef.current = null;
        }
    };

    /* =====================================================
       LOCATION (WEB)
    ===================================================== */
    const requestLocation = () => {
        if (!navigator.geolocation) {
            setCoords(DEFAULT_CENTER);
            setError("Geolocation is not supported by this browser.");
            return;
        }

        setLoading(true);
        setError(null);
        hasFetchedFacilities.current = false;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                hasResolvedLocation.current = true;
                setCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                if (hasResolvedLocation.current) return;

                setCoords(DEFAULT_CENTER);
                setError(
                    err.code === 1
                        ? "Location permission blocked. Allow it in browser settings."
                        : "Unable to determine your location."
                );
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 20000 }
        );
    };

    /* =====================================================
       AUTO REQUEST ON OPEN
    ===================================================== */
    useEffect(() => {
        if (visible) {
            hasResolvedLocation.current = false;
            hasFetchedFacilities.current = false;
            requestLocation();
        }
    }, [visible]);

    /* =====================================================
       FACILITIES (FROM SHARED MODULE) - WITH DEBOUNCING
    ===================================================== */
    const { facilities, loading: facilitiesLoading } = useFacilities(
        coords && !hasFetchedFacilities.current
            ? { latitude: coords.lat, longitude: coords.lng }
            : null
    );

    /* =====================================================
       MARK FACILITIES AS FETCHED WHEN THEY ARRIVE
    ===================================================== */
    useEffect(() => {
        if (facilities && !hasFetchedFacilities.current) {
            hasFetchedFacilities.current = true;
        }
    }, [facilities]);

    /* =====================================================
       INIT MAPLIBRE
    ===================================================== */
    useEffect(() => {
        if (!visible || !coords) return;

        const container = document.getElementById(MAP_CONTAINER_ID);
        if (!container) return;

        // ✅ SAFE CLEANUP BEFORE CREATING NEW MAP
        safeDestroyMap();

        const map = new maplibregl.Map({
            container,
            center: [coords.lng, coords.lat],
            zoom: 15.5,
            pitch: 45,
            bearing: 0,
            style: "https://tiles.openfreemap.org/styles/positron",

        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

        /* USER LOCATION MARKER */
        new maplibregl.Marker({ color: "#6A1B9A" })
            .setLngLat([coords.lng, coords.lat])
            .addTo(map);

        mapRef.current = map;

        // ✅ SAFE CLEANUP ON UNMOUNT
        return () => {
            safeDestroyMap();
        };
    }, [coords, visible]);

    /* =====================================================
       RENDER FACILITIES ON MAP (FROM MODULE)
    ===================================================== */
    useEffect(() => {
        if (!mapRef.current || !facilities?.length) return;
        renderFacilitiesOnMap(mapRef.current, facilities);
    }, [facilities]);

    /* =====================================================
       CLEANUP WHEN MODAL CLOSES
    ===================================================== */
    useEffect(() => {
        if (!visible) {
            safeDestroyMap();
            setCoords(null);
            setError(null);
            setLoading(false);
            hasFetchedFacilities.current = false;
        }
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={tw`flex-1 bg-black/40 justify-end`}>
                <View style={tw`bg-white rounded-t-3xl p-4 h-[90%]`}>
                    {/* HEADER */}
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 18 }}>
                            Locating Nearby Help
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} />
                        </TouchableOpacity>
                    </View>

                    {/* LOADING (LOCATION) */}
                    {loading && (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <ActivityIndicator size="large" color="#6A1B9A" />
                            <Text style={[tw`mt-3`, { fontFamily: "Poppins-Regular" }]}>
                                Getting your location…
                            </Text>
                        </View>
                    )}

                    {/* MAP + FACILITIES */}
                    {!loading && coords && (
                        <>
                            <div
                                id={MAP_CONTAINER_ID}
                                style={{
                                    width: "100%",
                                    height: "45vh",
                                    borderRadius: 16,
                                    overflow: "hidden",
                                }}
                            />
                            {/* ERROR */}
                            {!loading && error && (
                                <View style={tw`mt-3 items-center`}>
                                    <Text style={[tw`text-amber-600 text-sm text-center`, { fontFamily: "Poppins-Regular" }]}>
                                        {error}
                                    </Text>

                                    <TouchableOpacity
                                        onPress={requestLocation}
                                        style={tw`mt-2 border border-purple-700 px-4 py-2 rounded-full`}
                                    >
                                        <Text style={[tw`text-purple-700`, { fontFamily: "Poppins-Medium" }]}>
                                            Retry Location
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {facilitiesLoading && (
                                <ShimmerLoader width={100} height={100} />
                            )}

                            <Facilities facilities={facilities} />
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}