// theme/colors.js

export const purpleGoldTheme = {
  primary: '#6A1B9A', // Purple
  primaryLight: '#9C4DCC',
  primaryDark: '#38006B',
  secondary: '#FFD700', // Gold
  secondaryLight: '#FFFF52',
  secondaryDark: '#C7A600',
  accent: '#FFFFFF', // White
  accentLight: '#F5F5F5',
  accentDark: '#E0E0E0',
  
  // Background colors
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  
  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',
  textDisabled: '#BDBDBD',
  
  // Status colors
  success: '#4CAF50',
  successLight: '#81C784',
  successDark: '#388E3C',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  warningDark: '#F57C00',
  error: '#B00020',
  errorLight: '#CF6679',
  errorDark: '#9B0000',
  info: '#2196F3',
  infoLight: '#64B5F6',
  infoDark: '#1976D2',
  
  // UI element colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  borderDark: '#BDBDBD',
  divider: '#EEEEEE',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(106, 27, 154, 0.1)',
  backdrop: 'rgba(0, 0, 0, 0.3)',
  
  // Gradients
  gradientPrimary: ['#6A1B9A', '#8E24AA'],
  gradientSecondary: ['#FFD700', '#FFE055'],
  gradientAccent: ['#FFFFFF', '#F5F5F5'],
  gradientSuccess: ['#4CAF50', '#66BB6A'],
  
  // Special app colors
  badgeMentor: '#4CAF50',
  badgeEntrepreneur: '#2196F3',
  badgeAdvocate: '#FF9800',
  badgeChangemaker: '#9C27B0',
  badgeVerified: '#FFD700',
  
  // Chat colors
  chatSent: '#6A1B9A',
  chatReceived: '#F5F5F5',
  chatSystem: '#FFD700',
  
  // Status indicators
  online: '#4CAF50',
  away: '#FF9800',
  busy: '#F44336',
  offline: '#9E9E9E',
};

export const lightTheme = {
  ...purpleGoldTheme,
  // Light theme uses the base purpleGoldTheme as is
  mode: 'light',
  
  // Optional light theme overrides
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

export const darkTheme = {
  ...purpleGoldTheme,
  mode: 'dark',
  
  // Dark theme overrides
  primary: '#7E57C2', // Lighter purple for dark mode
  primaryLight: '#9575CD',
  primaryDark: '#5E35B1',
  secondary: '#FFD700', // Gold remains the same
  accent: '#FFFFFF',
  
  // Background colors for dark mode
  background: '#121212',
  surface: '#1E1E1E',
  card: '#1E1E1E',
  cardElevated: '#2D2D2D',
  
  // Text colors for dark mode
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#212121',
  textDisabled: '#666666',
  
  // UI element colors for dark mode
  border: '#333333',
  borderLight: '#2A2A2A',
  borderDark: '#404040',
  divider: '#2D2D2D',
  overlay: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  
  // Chat colors for dark mode
  chatSent: '#7E57C2',
  chatReceived: '#2D2D2D',
  chatSystem: '#FFD700',
};

// Additional color utilities
export const getThemeColors = (colorScheme = 'light') => {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

// Helper function for opacity
export const withOpacity = (color, opacity) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Color palette for specific components
export const badgeColors = {
  mentor: '#4CAF50',
  entrepreneur: '#2196F3',
  advocate: '#FF9800',
  changemaker: '#9C27B0',
  leader: '#6A1B9A',
  volunteer: '#607D8B',
  founder: '#E91E63',
  speaker: '#009688',
};

export const categoryColors = {
  leadership: '#6A1B9A',
  finance: '#4CAF50',
  wellness: '#2196F3',
  advocacy: '#FF9800',
  legacy: '#9C27B0',
  arts: '#E91E63',
  health: '#009688',
  education: '#607D8B',
};

export default {
  lightTheme,
  darkTheme,
  purpleGoldTheme,
  getThemeColors,
  withOpacity,
  badgeColors,
  categoryColors,
};