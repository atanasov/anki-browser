/**
 * AnkiConnect Service
 *
 * Handles ALL communication with the AnkiConnect API.
 * AnkiConnect is an Anki Desktop add-on that provides a REST API
 * for external applications to interact with Anki.
 *
 * Architecture:
 * - All methods are async (API calls over HTTP)
 * - Uses fetch() for HTTP requests
 * - Reads URL and token from dataService settings
 * - Throws errors on failure (components should handle with try-catch)
 *
 * Requirements:
 * - Anki Desktop must be running
 * - AnkiConnect add-on must be installed
 * - Default URL: http://localhost:8765
 *
 * API Documentation:
 * https://git.sr.ht/~foosoft/anki-connect
 *
 * @example
 * // Get all decks
 * const decks = await ankiConnect.getDeckNames();
 *
 * @example
 * // Find notes
 * const noteIds = await ankiConnect.findNotes('deck:Default');
 * const notes = await ankiConnect.getNotesInfo(noteIds);
 */

import dataService from "./dataService";

class AnkiConnectService {
  /**
   * Get the AnkiConnect URL from settings
   *
   * Ensures URL ends with / for proper API endpoint construction.
   *
   * @returns {string} AnkiConnect URL (e.g., "http://localhost:8765/")
   */
  getUrl() {
    const url = dataService.getSetting(
      "ankiConnectUrl",
      "http://localhost:8765"
    );
    // Ensure URL ends with / for consistency
    return url.endsWith("/") ? url : `${url}/`;
  }

  /**
   * Make a request to AnkiConnect API
   *
   * This is the core method that all other methods use.
   * It handles:
   * - Building the request body (action, version, params, key)
   * - Making the HTTP POST request
   * - Parsing the response
   * - Error handling (HTTP errors and AnkiConnect errors)
   *
   * AnkiConnect Request Format:
   * {
   *   "action": "deckNames",
   *   "version": 6,
   *   "params": {},
   *   "key": "optional-api-key"
   * }
   *
   * AnkiConnect Response Format:
   * {
   *   "result": [...],  // The actual data
   *   "error": null     // Error message or null
   * }
   *
   * @param {string} action - AnkiConnect action name (e.g., "deckNames")
   * @param {Object} params - Action parameters (default: {})
   * @returns {Promise<*>} The result from AnkiConnect
   * @throws {Error} If HTTP request fails or AnkiConnect returns an error
   */
  async makeRequest(action, params = {}) {
    const requestParams = Object.keys(params).length === 0 ? {} : params;
    const url = this.getUrl();
    const token = dataService.getSetting("ankiConnectToken", "");

    // Build request body according to AnkiConnect API spec
    const requestBody = {
      action,
      version: 6, // AnkiConnect API version
      params: requestParams,
    };

    // Add API key if configured (for security)
    if (token) {
      requestBody.key = token;
    }

    // Make HTTP POST request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Check HTTP status
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();

    // Check for AnkiConnect-level errors
    if (data.error !== null) {
      throw new Error(`AnkiConnect error: ${data.error}`);
    }

    // Return the result (the actual data we want)
    return data.result;
  }

  /**
   * Get AnkiConnect version
   *
   * Used to verify AnkiConnect is installed and working.
   *
   * @returns {Promise<number>} Version number (e.g., 6)
   * @throws {Error} If AnkiConnect is not running
   */
  async version() {
    return await this.makeRequest("version");
  }

  /**
   * Test connection to AnkiConnect
   *
   * Safe method that doesn't throw errors.
   * Use this to check if Anki is running before making other calls.
   *
   * @returns {Promise<boolean>} true if connected, false otherwise
   */
  async testConnection() {
    try {
      const version = await this.version();
      return version !== null;
    } catch {
      // Anki not running or AnkiConnect not installed
      return false;
    }
  }

  /**
   * Get all deck names
   *
   * @returns {Promise<string[]>} Array of deck names (e.g., ["Default", "Japanese"])
   * @throws {Error} If request fails
   */
  async getDeckNames() {
    return await this.makeRequest("deckNames");
  }

  /**
   * Get all note types (models)
   *
   * Note types define the structure of cards (what fields they have).
   * In Anki, they're called "models" in the API.
   *
   * @returns {Promise<string[]>} Array of note type names (e.g., ["Basic", "Cloze"])
   * @throws {Error} If request fails
   */
  async getNoteTypes() {
    return await this.makeRequest("modelNames");
  }

  /**
   * Get all model names (alias for getNoteTypes)
   *
   * Provided for compatibility with AnkiConnect API terminology.
   *
   * @returns {Promise<string[]>} Array of model names
   */
  async getModelNames() {
    return await this.getNoteTypes();
  }

  /**
   * Get field names for a specific note type
   *
   * Fields are the data points in a note (e.g., "Front", "Back", "Audio").
   *
   * @param {string} noteTypeName - Note type name (e.g., "Basic")
   * @returns {Promise<string[]>} Array of field names (e.g., ["Front", "Back"])
   * @throws {Error} If note type doesn't exist or request fails
   */
  async getFieldNames(noteTypeName) {
    return await this.makeRequest("modelFieldNames", {
      modelName: noteTypeName,
    });
  }

  /**
   * Get model field names (alias for getFieldNames)
   *
   * Provided for compatibility with AnkiConnect API terminology.
   *
   * @param {string} modelName - Model name
   * @returns {Promise<string[]>} Array of field names
   */
  async getModelFieldNames(modelName) {
    return await this.getFieldNames(modelName);
  }

  /**
   * Find notes using a query
   *
   * Returns note IDs only. Use getNotesInfo() to get full note data.
   *
   * Query syntax examples:
   * - "deck:Default" - All notes in Default deck
   * - "is:due" - All due cards
   * - "tag:important" - All notes with "important" tag
   * - "deck:Japanese is:due" - Due cards in Japanese deck
   *
   * @param {string} query - Anki search query
   * @returns {Promise<number[]>} Array of note IDs
   * @throws {Error} If query is invalid or request fails
   */
  async findNotes(query) {
    return await this.makeRequest("findNotes", { query });
  }

  /**
   * Get detailed information about notes
   *
   * Returns full note data including fields, tags, cards, etc.
   *
   * @param {number[]} noteIds - Array of note IDs from findNotes()
   * @returns {Promise<Object[]>} Array of note objects
   * @throws {Error} If request fails
   */
  async getNotesInfo(noteIds) {
    if (!noteIds || noteIds.length === 0) {
      return [];
    }
    return await this.makeRequest("notesInfo", { notes: noteIds });
  }

  /**
   * Find cards using a query
   *
   * Similar to findNotes() but returns card IDs instead of note IDs.
   * A note can have multiple cards (e.g., front→back and back→front).
   *
   * @param {string} query - Anki search query
   * @returns {Promise<number[]>} Array of card IDs
   * @throws {Error} If query is invalid or request fails
   */
  async findCards(query) {
    return await this.makeRequest("findCards", { query });
  }

  /**
   * Get detailed information about cards
   *
   * @param {number[]} cardIds - Array of card IDs from findCards()
   * @returns {Promise<Object[]>} Array of card objects
   * @throws {Error} If request fails
   */
  async getCardsInfo(cardIds) {
    if (!cardIds || cardIds.length === 0) {
      return [];
    }
    return await this.makeRequest("cardsInfo", { cards: cardIds });
  }

  /**
   * Enhanced query method that returns note data directly
   *
   * Convenience method that combines findNotes() + getNotesInfo().
   * Useful when you want note data immediately without two separate calls.
   *
   * @param {string} query - Anki search query
   * @param {number} limit - Maximum number of notes to return (0 = no limit)
   * @returns {Promise<Object[]>} Array of note objects (limited)
   * @throws {Error} If request fails
   */
  async findNotesWithQuery(query, limit = 40) {
    // Find note IDs first
    const noteIds = await this.findNotes(query);

    if (!noteIds || noteIds.length === 0) {
      return [];
    }

    // Apply limit if specified
    const limitedNoteIds =
      limit > 0 && noteIds.length > limit ? noteIds.slice(0, limit) : noteIds;

    // Get detailed note information
    return await this.getNotesInfo(limitedNoteIds);
  }

  /**
   * Find notes with pagination support
   *
   * Used by CardBrowserPage to display notes in pages.
   *
   * Flow:
   * 1. Find all note IDs matching query
   * 2. Calculate pagination (total pages, current page, etc.)
   * 3. Slice note IDs for current page
   * 4. Get full note data for current page only
   *
   * Why not fetch all notes?
   * - Queries can return thousands of notes
   * - Fetching all would be slow and use lots of memory
   * - Pagination keeps it fast and responsive
   *
   * @param {string} query - Anki search query
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Notes per page
   * @returns {Promise<Object>} Object with notes array and pagination info
   * @throws {Error} If request fails
   */
  async findNotesWithPagination(query, page = 1, pageSize = 20) {
    // Find all note IDs first (just IDs, not full data)
    const allNoteIds = await this.findNotes(query);

    if (!allNoteIds || allNoteIds.length === 0) {
      // No notes found - return empty result with pagination info
      return {
        notes: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          pageSize,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Calculate pagination values
    const totalCount = allNoteIds.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Validate and clamp page number to valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    const validStartIndex = (validPage - 1) * pageSize;
    const validEndIndex = validStartIndex + pageSize;

    // Get note IDs for current page only
    const paginatedNoteIds = allNoteIds.slice(validStartIndex, validEndIndex);

    // Get detailed note information for current page
    const notesData = await this.getNotesInfo(paginatedNoteIds);

    return {
      notes: notesData,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalCount,
        pageSize,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
        startIndex: validStartIndex + 1, // 1-based for display
        endIndex: Math.min(validEndIndex, totalCount), // Don't exceed total count
      },
    };
  }

  /**
   * Get all note types with their field names
   *
   * Convenience method that fetches note types and their fields in one call.
   * Used by query editor to show available fields for selected note type.
   *
   * @returns {Promise<Object>} Object mapping note type names to field arrays
   * @example
   * {
   *   "Basic": ["Front", "Back"],
   *   "Cloze": ["Text", "Extra"]
   * }
   */
  async getNoteTypesWithFields() {
    const noteTypes = await this.getNoteTypes();
    const result = {};

    // Fetch fields for each note type
    for (const noteType of noteTypes) {
      try {
        const fieldNames = await this.getFieldNames(noteType);
        result[noteType] = fieldNames;
      } catch {
        // Failed to get field names for this note type (rare)
        result[noteType] = [];
      }
    }

    return result;
  }

  /**
   * Retrieve media file as base64
   *
   * Used to load images and audio from Anki's media collection.
   * Returns base64-encoded data that can be used in data URLs.
   *
   * @param {string} filename - Media filename (e.g., "audio.mp3", "image.jpg")
   * @returns {Promise<string>} Base64-encoded file data
   * @throws {Error} If filename is empty or file doesn't exist
   *
   * @example
   * const base64 = await ankiConnect.retrieveMediaFile("audio.mp3");
   * const dataUrl = `data:audio/mpeg;base64,${base64}`;
   */
  async retrieveMediaFile(filename) {
    if (!filename) {
      throw new Error("Filename is required");
    }

    return await this.makeRequest("retrieveMediaFile", {
      filename: filename,
    });
  }

  /**
   * Get all tags from Anki
   *
   * @returns {Promise<string[]>} Array of all tag names
   * @throws {Error} If request fails
   */
  async getTags() {
    return await this.makeRequest("getTags");
  }

  /**
   * Get tags for notes matching a query
   *
   * Returns only tags that are used by notes matching the query.
   * Useful for showing relevant tags in query builder.
   *
   * @param {string} query - Anki search query
   * @returns {Promise<string[]>} Array of unique tags (sorted)
   */
  async getTagsForNotes(query) {
    try {
      // Find notes matching the query
      const noteIds = await this.findNotes(query);

      if (!noteIds || noteIds.length === 0) {
        return [];
      }

      // Get note info to extract tags
      const notesInfo = await this.getNotesInfo(noteIds);

      // Extract unique tags from all notes using Set
      const tagsSet = new Set();
      notesInfo.forEach((note) => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach((tag) => tagsSet.add(tag));
        }
      });

      // Convert Set to sorted array
      return Array.from(tagsSet).sort();
    } catch (error) {
      // Don't throw - return empty array on error
      // This prevents breaking the UI if tag fetching fails
      console.error("Failed to get tags for notes:", error);
      return [];
    }
  }
  // ============ Bulk Edit Operations ============

  async addTags(noteIds, tags) {
    const tagsStr = Array.isArray(tags) ? tags.join(" ") : tags;
    return await this.makeRequest("addTags", { notes: noteIds, tags: tagsStr });
  }

  async removeTags(noteIds, tags) {
    const tagsStr = Array.isArray(tags) ? tags.join(" ") : tags;
    return await this.makeRequest("removeTags", { notes: noteIds, tags: tagsStr });
  }

  // cardIds array required for card-level operations
  async suspend(cardIds) {
    return await this.makeRequest("suspend", { cards: cardIds });
  }

  async unsuspend(cardIds) {
    return await this.makeRequest("unsuspend", { cards: cardIds });
  }

  // flag: 0 = none, 1 = red, 2 = orange, 3 = green, 4 = blue, 5 = pink, 6 = teal, 7 = purple
  async setFlag(cardIds, flag) {
    return await this.makeRequest("setFlag", { cards: cardIds, flag });
  }

  // days: "0" = today, "1" = tomorrow, etc.
  async setDueDate(cardIds, days = "0") {
    return await this.makeRequest("setDueDate", { cards: cardIds, days: String(days) });
  }

  // Open Anki browser with a search query (e.g. "nid:1234567890")
  async guiBrowse(query) {
    return await this.makeRequest("guiBrowse", { query });
  }
}

// Export a singleton instance
export default new AnkiConnectService();
