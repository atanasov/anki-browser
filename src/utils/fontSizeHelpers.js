/**
 * Font Size Helpers
 * Utilities for managing card content font sizes
 */

/**
 * Get Tailwind text size class for a given font size setting
 * @param {string} fontSize - Font size setting ("small" | "medium" | "large" | "xlarge" | "xxlarge" | "xxxlarge")
 * @returns {string} Tailwind text size class
 */
export const getFontSizeClass = (fontSize) => {
  const fontSizeMap = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    xlarge: "text-xl",
    xxlarge: "text-2xl",
    xxxlarge: "text-3xl",
  };

  return fontSizeMap[fontSize] || "text-base";
};

/**
 * Get all available font size options
 * @returns {Array} Array of font size options
 */
export const getFontSizeOptions = () => [
  { value: "small", label: "Small", class: "text-sm" },
  { value: "medium", label: "Medium", class: "text-base" },
  { value: "large", label: "Large", class: "text-lg" },
  { value: "xlarge", label: "Extra Large", class: "text-xl" },
  { value: "xxlarge", label: "Huge", class: "text-2xl" },
  { value: "xxxlarge", label: "Monstrous", class: "text-3xl" },
];
