/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  safelist: [
    // Grid card size classes for portrait and landscape aspect ratios
    "w-[352px]",
    "h-[352px]",
    "w-[512px]",
    "h-[512px]",
    "w-[768px]",
    "h-[768px]",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: "#374151",
        },
      },
      keyframes: {
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
