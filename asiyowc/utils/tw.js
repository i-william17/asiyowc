import { create } from "twrnc";

const tw = create(require(`../tailwind.config`));

// Corporate color constants
export const COLORS = {
  primary: {
    50: "#F3E5F6",
    100: "#E1BEE7",
    200: "#CE93D8",
    300: "#BA68C8",
    400: "#AB47BC",
    500: "#9C27B0",
    600: "#8E24AA",
    700: "#7B1FA2",
    800: "#6A1B9A",
    900: "#4A148C",
  },
  gold: {
    50: "#FFFDE7",
    100: "#FFF9C4",
    200: "#FFF59D",
    300: "#FFF176",
    400: "#FFEE58",
    500: "#FFD700",
    600: "#FBC02D",
    700: "#F9A825",
    800: "#F57F17",
    900: "#F57C00",
  },
  semantic: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  neutral: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
};

// Animation presets
export const ANIMATION_PRESETS = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  slideUp: {
    from: { translateY: 50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  bounceIn: {
    0: { scale: 0.3, opacity: 0 },
    0.5: { scale: 1.05, opacity: 1 },
    1: { scale: 1, opacity: 1 },
  },
};

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 48,
};

// Base typography scale
export const TYPOGRAPHY = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
  "4xl": { fontSize: 36, lineHeight: 40 },
};

// 🔥 Corporate Poppins Typography System
export const TYPO = {
  poppins: {
    light: {
      xs: { ...TYPOGRAPHY.xs, fontFamily: "Poppins-Light" },
      sm: { ...TYPOGRAPHY.sm, fontFamily: "Poppins-Light" },
      base: { ...TYPOGRAPHY.base, fontFamily: "Poppins-Light" },
      lg: { ...TYPOGRAPHY.lg, fontFamily: "Poppins-Light" },
      xl: { ...TYPOGRAPHY.xl, fontFamily: "Poppins-Light" },
      "2xl": { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-Light" },
    },
    regular: {
      xs: { ...TYPOGRAPHY.xs, fontFamily: "Poppins-Regular" },
      sm: { ...TYPOGRAPHY.sm, fontFamily: "Poppins-Regular" },
      base: { ...TYPOGRAPHY.base, fontFamily: "Poppins-Regular" },
      lg: { ...TYPOGRAPHY.lg, fontFamily: "Poppins-Regular" },
      xl: { ...TYPOGRAPHY.xl, fontFamily: "Poppins-Regular" },
      "2xl": { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-Regular" },
      "3xl": { ...TYPOGRAPHY["3xl"], fontFamily: "Poppins-Regular" },
    },
    medium: {
      base: { ...TYPOGRAPHY.base, fontFamily: "Poppins-Medium" },
      lg: { ...TYPOGRAPHY.lg, fontFamily: "Poppins-Medium" },
      xl: { ...TYPOGRAPHY.xl, fontFamily: "Poppins-Medium" },
      "2xl": { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-Medium" },
    },
    semibold: {
      lg: { ...TYPOGRAPHY.lg, fontFamily: "Poppins-SemiBold" },
      xl: { ...TYPOGRAPHY.xl, fontFamily: "Poppins-SemiBold" },
      "2xl": { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-SemiBold" },
      "3xl": { ...TYPOGRAPHY["3xl"], fontFamily: "Poppins-SemiBold" },
    },
    bold: {
      base: { ...TYPOGRAPHY.base, fontFamily: "Poppins-Bold" },
      xl: { ...TYPOGRAPHY.xl, fontFamily: "Poppins-Bold" },
      "2xl": { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-Bold" },
      "3xl": { ...TYPOGRAPHY["3xl"], fontFamily: "Poppins-Bold" },
      "4xl": { ...TYPOGRAPHY["4xl"], fontFamily: "Poppins-Bold" },
    },
    extrabold: {
      "3xl": { ...TYPOGRAPHY["3xl"], fontFamily: "Poppins-ExtraBold" },
      "4xl": { ...TYPOGRAPHY["4xl"], fontFamily: "Poppins-ExtraBold" },
    },
  },

  // Corporate shortcuts
  heading: {
    xl: { ...TYPOGRAPHY["3xl"], fontFamily: "Poppins-Bold" },
    lg: { ...TYPOGRAPHY["2xl"], fontFamily: "Poppins-SemiBold" },
  },
  body: {
    base: { ...TYPOGRAPHY.base, fontFamily: "Poppins-Regular" },
    sm: { ...TYPOGRAPHY.sm, fontFamily: "Poppins-Regular" },
    lg: { ...TYPOGRAPHY.lg, fontFamily: "Poppins-Regular" },
  },
};

export default tw;
