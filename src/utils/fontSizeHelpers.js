/**
 * Font Size Helpers
 * Utilities for managing card content font sizes
 */

const FONT_SIZE_OPTIONS = [
  { value: "small",    label: "S",   class: "text-sm"  },
  { value: "medium",   label: "M",   class: "text-base" },
  { value: "large",    label: "L",   class: "text-lg"  },
  { value: "xlarge",   label: "XL",  class: "text-xl"  },
  { value: "xxlarge",  label: "2XL", class: "text-2xl" },
  { value: "xxxlarge", label: "3XL", class: "text-3xl" },
  { value: "4xlarge",  label: "4XL", class: "text-4xl" },
  { value: "5xlarge",  label: "5XL", class: "text-5xl" },
];

export const getFontSizeClass = (fontSize) => {
  const option = FONT_SIZE_OPTIONS.find((o) => o.value === fontSize);
  return option ? option.class : "text-base";
};

export const getFontSizeOptions = () => FONT_SIZE_OPTIONS;
