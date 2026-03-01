import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PHOEBE_ASIYO_QUOTES } from "../../constants/phoebeAsiyoQuotes";

const QuoteCard = () => {
  const quote = useMemo(() => {
    const dayIndex = new Date().getDate() % PHOEBE_ASIYO_QUOTES.length;
    return PHOEBE_ASIYO_QUOTES[dayIndex];
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [didMeasure, setDidMeasure] = useState(false);

  // Animate actual pixel height (more reliable than 0..1 interpolation on web)
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // When we first measure, initialize height to expanded height.
  useEffect(() => {
    if (didMeasure && measuredHeight > 0) {
      heightAnim.setValue(measuredHeight);
      opacityAnim.setValue(1);
    }
  }, [didMeasure, measuredHeight, heightAnim, opacityAnim]);

  const runAnim = (toCollapsed) => {
    if (!didMeasure || measuredHeight <= 0) {
      // Fallback: still toggle even if measurement isn't ready
      setCollapsed(toCollapsed);
      return;
    }

    setCollapsed(toCollapsed);

    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: toCollapsed ? 0 : measuredHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // height can't use native driver
      }),
      Animated.timing(opacityAnim, {
        toValue: toCollapsed ? 0 : 1,
        duration: toCollapsed ? 160 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // keep consistent across web/mobile
      }),
    ]).start();
  };

  const collapse = () => runAnim(true);
  const expand = () => runAnim(false);

  return (
    <View
      style={{
        backgroundColor: "#6A1B9A",
        borderRadius: 18, // slightly smaller
        marginBottom: 18, // slightly smaller
        overflow: "hidden",
        elevation: 3,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 16, // reduced
        }}
      >
        <MaterialCommunityIcons
          name="format-quote-open"
          size={26}
          color="#FACC15"
        />

        {collapsed ? (
          <TouchableOpacity onPress={expand} hitSlop={10}>
            <MaterialCommunityIcons
              name="chevron-down"
              size={28}
              color="#FACC15"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={collapse} hitSlop={10}>
            <MaterialCommunityIcons
              name="chevron-up"
              size={28}
              color="#FACC15"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* MEASURER (invisible) - only used once to get real content height */}
      {!didMeasure && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            opacity: 0,
            zIndex: -1,
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          pointerEvents="none"
          onLayout={(e) => {
            const h = e?.nativeEvent?.layout?.height ?? 0;
            if (h > 0) {
              setMeasuredHeight(h);
              setDidMeasure(true);
            }
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: "Poppins-Regular",
              fontSize: 18, // slightly smaller
              lineHeight: 25, // slightly tighter
              fontStyle: "italic",
              marginBottom: 14, // reduced
            }}
          >
            {quote.text}
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "Poppins-SemiBold",
              fontSize: 14, // slightly smaller
              marginBottom: 12,
            }}
          >
            — {quote.author}
          </Text>

          <MaterialCommunityIcons
            name="format-quote-close"
            size={26}
            color="#FACC15"
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
            }}
          />
        </View>
      )}

      {/* COLLAPSIBLE CONTENT */}
      <Animated.View
        style={{
          height: didMeasure ? heightAnim : "auto",
          opacity: opacityAnim,
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            lineHeight: 25,
            fontStyle: "italic",
            marginBottom: 12,
          }}
        >
          {quote.text}
        </Text>

        <Text
          style={{
            color: "rgba(255,255,255,0.9)",
            fontFamily: "Poppins-SemiBold",
            fontSize: 13,
          }}
        >
          — {quote.author}
        </Text>

        <MaterialCommunityIcons
          name="format-quote-close"
          size={26}
          color="#FACC15"
          style={{
            position: "absolute",
            bottom: 8,
            right: 12,
          }}
        />
      </Animated.View>
    </View>
  );
};

export default QuoteCard;