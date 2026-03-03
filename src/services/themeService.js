/**
 * Theme Management Service
 * Simplified - now uses dataService for storage
 */

import logger from "../utils/logger";
import dataService from "./dataService";

const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
};

class ThemeService {
  constructor() {
    this.currentTheme = dataService.getTheme();
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.listeners = new Set();

    // Listen for system theme changes
    this.mediaQuery.addEventListener(
      "change",
      this.handleSystemThemeChange.bind(this)
    );

    // Apply initial theme
    this.applyTheme();
  }

  getEffectiveTheme() {
    if (this.currentTheme === THEMES.SYSTEM) {
      return this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
    }
    return this.currentTheme;
  }

  setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
      logger.warn(`Invalid theme: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    dataService.setTheme(theme);
    this.applyTheme();
    this.notifyListeners();
  }

  cycleTheme() {
    const themeOrder = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];
    const currentIndex = themeOrder.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    this.setTheme(themeOrder[nextIndex]);
  }

  applyTheme() {
    const effectiveTheme = this.getEffectiveTheme();
    const isDark = effectiveTheme === THEMES.DARK;

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  handleSystemThemeChange() {
    if (this.currentTheme === THEMES.SYSTEM) {
      this.applyTheme();
      this.notifyListeners();
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentTheme, this.getEffectiveTheme());
      } catch (error) {
        logger.error("Theme listener error:", error);
      }
    });
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  static get THEMES() {
    return THEMES;
  }
}

export default new ThemeService();
