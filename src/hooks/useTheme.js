/**
 * Theme Hook
 *
 * Manages theme state (light, dark, auto) using themeService.
 * Automatically syncs with system theme when 'auto' is selected.
 *
 * Theme values:
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'auto': Follow system preference
 *
 * The hook maintains two theme values:
 * - currentTheme: User's selected theme ('light', 'dark', or 'auto')
 * - effectiveTheme: Actual theme being applied ('light' or 'dark')
 *
 * @returns {Object} Theme state and actions
 * @returns {string} currentTheme - User's selected theme setting
 * @returns {string} effectiveTheme - Actual theme being applied
 * @returns {Function} setTheme - Set theme ('light', 'dark', or 'auto')
 * @returns {Function} cycleTheme - Cycle through themes (light → dark → auto → light)
 * @returns {boolean} isDark - Convenience flag for dark theme
 * @returns {Object} THEMES - Available theme constants
 *
 * @example
 * const { currentTheme, effectiveTheme, setTheme, cycleTheme, isDark } = useTheme();
 *
 * // Check current theme
 * console.log(currentTheme); // 'auto'
 * console.log(effectiveTheme); // 'dark' (if system is dark)
 * console.log(isDark); // true
 *
 * // Set specific theme
 * setTheme('dark');
 *
 * // Cycle through themes
 * cycleTheme(); // light → dark → auto → light
 */

import { useState, useEffect } from "react";
import themeService from "../services/themeService";

export function useTheme() {
  // Initialize state from themeService
  const [currentTheme, setCurrentTheme] = useState(
    themeService.getCurrentTheme()
  );
  const [effectiveTheme, setEffectiveTheme] = useState(
    themeService.getEffectiveTheme()
  );

  // Subscribe to theme changes
  // This keeps the hook in sync when theme changes from other sources
  useEffect(() => {
    const unsubscribe = themeService.addListener((theme, effective) => {
      setCurrentTheme(theme);
      setEffectiveTheme(effective);
    });

    // Cleanup: unsubscribe when component unmounts
    return unsubscribe;
  }, []);

  // Set theme (delegates to themeService)
  const setTheme = (theme) => {
    themeService.setTheme(theme);
  };

  // Cycle through themes (delegates to themeService)
  const cycleTheme = () => {
    themeService.cycleTheme();
  };

  return {
    currentTheme, // User's selected theme ('light', 'dark', or 'auto')
    effectiveTheme, // Actual theme being applied ('light' or 'dark')
    setTheme, // Function to set theme
    cycleTheme, // Function to cycle through themes
    isDark: effectiveTheme === "dark", // Convenience flag
    THEMES: themeService.constructor.THEMES, // Available theme constants
  };
}
