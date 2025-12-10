// Happy InLine Brand Colors
export const COLORS = {
  // Primary Brand Colors
  primary: '#4A90E2',        // Main blue from logo
  primaryDark: '#3A7BC8',    // Darker blue for pressed states
  primaryLight: '#6BA3E8',   // Lighter blue for backgrounds

  // Neutral Colors
  dark: '#1A1A2E',           // Dark navy for backgrounds
  black: '#000000',          // True black
  white: '#FFFFFF',          // White

  // Grays
  gray100: '#F5F5F7',        // Lightest gray
  gray200: '#E5E5EA',
  gray300: '#D1D1D6',
  gray400: '#C7C7CC',
  gray500: '#AEAEB2',
  gray600: '#8E8E93',
  gray700: '#636366',
  gray800: '#48484A',
  gray900: '#3A3A3C',

  // Semantic Colors
  success: '#34C759',        // Green for success states
  warning: '#FF9500',        // Orange for warnings
  error: '#FF3B30',          // Red for errors
  info: '#5AC8FA',           // Light blue for info

  // Text Colors
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Background Colors
  background: '#F5F5F7',
  backgroundDark: '#1A1A2E',
  backgroundLight: '#FFFFFF',

  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#CCCCCC',
};

// Legacy color mapping (for gradual migration)
export const LEGACY_COLORS = {
  red: COLORS.error,  // Map old red to error red
  // Add more legacy mappings as needed
};

export default COLORS;
