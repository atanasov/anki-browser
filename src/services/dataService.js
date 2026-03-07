/**
 * Data Service
 *
 * SINGLE SOURCE OF TRUTH for all application data.
 * This service manages ALL data operations for the app - nothing should
 * read from or write to localStorage directly.
 *
 * Architecture:
 * - Uses a single localStorage key: "anki-games-data"
 * - All data stored in one JSON object with version tracking
 * - Views use UUID-based arrays
 * - Notifies listeners (Zustand store) when data changes
 *
 * Data Structure:
 * {
 *   version: "2.0",
 *   theme: "system" | "light" | "dark",
 *   settings: { ... },
 *   views: [ { id: uuid, ... }, ... ]
 * }
 *
 * Why this pattern?
 * - Single localStorage key = easier to manage, export, import
 * - UUIDs = stable references (no issues with renaming)
 * - Listener pattern = keeps Zustand store in sync
 *
 * @example
 * // Reading data
 * const views = dataService.getViews();
 * const activeView = dataService.getActiveView();
 *
 * @example
 * // Writing data
 * const newView = dataService.createView({ name: 'My View', ... });
 * dataService.updateView(viewId, { name: 'Updated Name' });
 *
 * @example
 * // Listening to changes (used by Zustand)
 * const unsubscribe = dataService.addListener((data) => {
 *   console.log('Data changed:', data);
 * });
 */

import logger from "../utils/logger";

// Single localStorage key for all app data
const STORAGE_KEY = "anki-games-data";

// Default structure for application data
export const DEFAULT_APP_DATA = {
  version: "2.0",
  theme: "system",
  settings: {
    ankiConnectUrl: "http://localhost:8765",
    ankiConnectToken: "",
    mediaCacheDurationHours: 24,
    activeViewId: null,
    fontSize: "medium", // "small" | "medium" | "large" | "xlarge"
    gridSize: "medium", // "small" | "medium" | "large"
    aspectRatio: "square", // "square" | "portrait" | "landscape"
    fitToCard: false, // auto-size font to fill card
  },
  views: [],
};

// Default structure for a view
export const DEFAULT_VIEW = {
  id: null, // Will be set to crypto.randomUUID()
  name: "", // e.g., "Chinese HSK Flashcards"
  deck: "", // Anki deck name
  noteType: "", // Anki note type name
  frontFields: [], // Array of field names to show on front side
  backFields: [], // Array of field names to show on back side
  settings: {
    showImages: false,
    imageField: "",
    showAudio: false,
    audioField: "",
  },
  similarWords: {
    enabled: false,
    deck: "",
    noteType: "",
    wordField: "",
    pinyinField: "",
    translationField: "",
  },
  // Advanced query (optional - for power users)
  rawQuery: "", // e.g., "deck:MyDeck note:MyNote is:due"
  // Metadata
  createdAt: null,
  lastUsed: null,
};

class DataService {
  constructor() {
    // Load data from localStorage on initialization
    this.data = this.loadData();

    // Set of listener functions (Zustand store subscribes here)
    // Using Set instead of array for O(1) add/remove operations
    this.listeners = new Set();
  }

  /**
   * Load data from localStorage
   *
   * Includes migration from old "games"/"activeGameId" keys to "views"/"activeViewId".
   *
   * @returns {Object} Complete app data object
   */
  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Migration: "games" → "views", "activeGameId" → "activeViewId"
        const views = parsed.views || parsed.games || [];
        const activeViewId =
          parsed.settings?.activeViewId ??
          parsed.settings?.activeGameId ??
          null;

        return {
          ...DEFAULT_APP_DATA,
          ...parsed,
          settings: {
            ...DEFAULT_APP_DATA.settings,
            ...(parsed.settings || {}),
            activeViewId,
          },
          views,
        };
      }
    } catch (error) {
      logger.error("Failed to load data:", error);
      // Fall through to return defaults
    }

    // No data found or error occurred - return fresh defaults
    return { ...DEFAULT_APP_DATA };
  }

  /**
   * Save data to localStorage and notify listeners
   */
  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notifyListeners();
    } catch (error) {
      logger.error("Failed to save data:", error);
    }
  }

  /**
   * Get all data (used by Zustand for initial sync)
   *
   * @returns {Object} Complete app data object
   */
  getData() {
    return this.data;
  }

  /**
   * Get current theme setting
   *
   * @returns {string} "system" | "light" | "dark"
   */
  getTheme() {
    return this.data.theme;
  }

  /**
   * Set theme and save
   *
   * @param {string} theme - "system" | "light" | "dark"
   */
  setTheme(theme) {
    this.data.theme = theme;
    this.saveData();
  }

  // ============ Settings ============

  /**
   * Get all settings
   *
   * @returns {Object} Settings object
   */
  getSettings() {
    return this.data.settings;
  }

  /**
   * Update multiple settings at once
   *
   * @param {Object} updates - Settings to update
   */
  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData();
  }

  /**
   * Get a single setting value
   *
   * @param {string} key - Setting key
   * @param {*} defaultValue - Value to return if setting doesn't exist
   * @returns {*} Setting value or defaultValue
   */
  getSetting(key, defaultValue = null) {
    return this.data.settings[key] ?? defaultValue;
  }

  /**
   * Set a single setting value
   *
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  setSetting(key, value) {
    this.data.settings[key] = value;
    this.saveData();
  }

  // ============ Views ============
  // Views define which cards to load and how to display them

  /**
   * Get all views
   *
   * @returns {Array} Array of view objects
   */
  getViews() {
    return this.data.views || [];
  }

  /**
   * Get a single view by ID
   *
   * @param {string} id - View UUID
   * @returns {Object|null} View object or null if not found
   */
  getView(id) {
    return this.getViews().find((v) => v.id === id) || null;
  }

  /**
   * Get the currently active view
   *
   * @returns {Object|null} Active view object or null if none active
   */
  getActiveView() {
    const activeId = this.data.settings.activeViewId;
    return activeId ? this.getView(activeId) : null;
  }

  /**
   * Create a new view
   *
   * @param {Object} viewData - View configuration
   * @returns {Object} Created view with generated ID
   */
  createView(viewData) {
    const newView = {
      ...DEFAULT_VIEW,
      ...viewData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      frontFields: viewData.frontFields || [],
      backFields: viewData.backFields || [],
      settings: {
        ...DEFAULT_VIEW.settings,
        ...(viewData.settings || {}),
      },
    };

    if (!this.data.views) {
      this.data.views = [];
    }

    this.data.views.push(newView);
    this.saveData();

    return newView;
  }

  /**
   * Update an existing view
   *
   * @param {string} id - View UUID
   * @param {Object} updates - Fields to update
   * @returns {boolean} true if updated, false if view not found
   */
  updateView(id, updates) {
    if (!this.data.views) {
      this.data.views = [];
    }

    const index = this.data.views.findIndex((v) => v.id === id);
    if (index === -1) return false;

    const updatedViews = [...this.data.views];
    updatedViews[index] = {
      ...this.data.views[index],
      ...updates,
      lastUsed: new Date().toISOString(),
      settings: updates.settings
        ? {
            ...this.data.views[index].settings,
            ...updates.settings,
          }
        : this.data.views[index].settings,
    };
    this.data.views = updatedViews;

    this.saveData();
    return true;
  }

  /**
   * Delete a view
   *
   * Also clears active view if the deleted view was active.
   *
   * @param {string} id - View UUID
   * @returns {boolean} true if deleted, false if view not found
   */
  deleteView(id) {
    if (!this.data.views) {
      this.data.views = [];
    }

    const index = this.data.views.findIndex((v) => v.id === id);
    if (index === -1) return false;

    this.data.views.splice(index, 1);

    if (this.data.settings.activeViewId === id) {
      this.data.settings.activeViewId = null;
    }

    this.saveData();
    return true;
  }

  /**
   * Set the active view
   *
   * @param {string|null} id - View UUID or null to clear active view
   * @returns {boolean} true if set, false if view not found
   */
  setActiveView(id) {
    if (id && !this.getView(id)) return false;

    this.data.settings.activeViewId = id;

    if (id) {
      this.updateView(id, {}); // Updates lastUsed timestamp
    }

    this.saveData();
    return true;
  }

  // ============ Utility Methods ============

  /**
   * Add a listener for data changes
   *
   * @param {Function} callback - Function to call when data changes
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners that data has changed
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.data);
      } catch (error) {
        logger.error("Listener error:", error);
      }
    });
  }

  /**
   * Export all data as JSON string
   *
   * @returns {string} Pretty-printed JSON string
   */
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import data from JSON string
   *
   * @param {string} jsonString - JSON string to import
   * @param {boolean} overwrite - If true, replace all data. If false, merge views.
   * @returns {boolean} true if successful, false if failed
   */
  importData(jsonString, overwrite = true) {
    try {
      const importedData = JSON.parse(jsonString);

      if (overwrite) {
        this.data = {
          ...DEFAULT_APP_DATA,
          ...importedData,
          settings: {
            ...DEFAULT_APP_DATA.settings,
            ...(importedData.settings || {}),
          },
          // Support importing old exports with "games" key
          views: importedData.views || importedData.games || [],
        };
      } else {
        // Merge views (add imported views to existing ones)
        const importedViews = importedData.views || importedData.games || [];
        this.data.views = [...this.data.views, ...importedViews];
      }

      this.saveData();
      return true;
    } catch (error) {
      logger.error("Import failed:", error);
      return false;
    }
  }

  /**
   * Reset all data to defaults
   *
   * WARNING: This deletes everything!
   */
  resetAll() {
    this.data = { ...DEFAULT_APP_DATA };
    localStorage.removeItem("anki-games-data");
    this.notifyListeners();
  }
}

// Export a singleton instance
export default new DataService();
