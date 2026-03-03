/**
 * Grid Helpers
 * Utilities for managing card grid sizes and aspect ratios
 */

/**
 * Get Tailwind size classes for a given grid size setting
 * @param {string} gridSize - Grid size setting ("small" | "medium" | "large")
 * @returns {string} Tailwind width and height classes
 */
export const getGridSizeClass = (gridSize) => {
  const gridSizeMap = {
    small: "w-44 h-44", // ~176px × 176px (-30% from medium)
    medium: "w-64 h-64", // 256px × 256px (current default)
    large: "w-96 h-96", // 384px × 384px (+50% from medium)
  };

  return gridSizeMap[gridSize] || "w-64 h-64";
};

/**
 * Get Tailwind aspect ratio classes for a given aspect ratio setting
 * @param {string} aspectRatio - Aspect ratio setting ("square" | "portrait" | "landscape")
 * @param {string} gridSize - Grid size setting to calculate dimensions
 * @returns {string} Tailwind width and height classes
 */
export const getAspectRatioClass = (aspectRatio, gridSize = "medium") => {
  // Hardcoded values for Tailwind JIT to detect at build time
  // Template literals don't work with Tailwind's scanner
  const aspectRatioMap = {
    square: {
      small: "w-44 h-44", // 176px × 176px
      medium: "w-64 h-64", // 256px × 256px
      large: "w-96 h-96", // 384px × 384px
    },
    portrait: {
      // 1:2 ratio - height is 2x width
      small: "w-44 h-[352px]", // 176px × 352px
      medium: "w-64 h-[512px]", // 256px × 512px
      large: "w-96 h-[768px]", // 384px × 768px
    },
    landscape: {
      // 2:1 ratio - width is 2x height
      small: "w-[352px] h-44", // 352px × 176px
      medium: "w-[512px] h-64", // 512px × 256px
      large: "w-[768px] h-96", // 768px × 384px
    },
  };

  return (
    aspectRatioMap[aspectRatio]?.[gridSize] || aspectRatioMap.square[gridSize]
  );
};

/**
 * Get combined size and aspect ratio classes
 * @param {string} gridSize - Grid size setting
 * @param {string} aspectRatio - Aspect ratio setting
 * @returns {string} Combined Tailwind classes
 */
export const getCardDimensionClasses = (gridSize, aspectRatio) => {
  if (aspectRatio === "square") {
    // For square, just use the grid size
    return getGridSizeClass(gridSize);
  }

  // For non-square ratios, calculate based on both settings
  return getAspectRatioClass(aspectRatio, gridSize);
};

