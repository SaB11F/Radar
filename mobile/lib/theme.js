import COLORS from "../constants/colors";

export const theme = {
  colors: {
    ...COLORS,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 28,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
};
