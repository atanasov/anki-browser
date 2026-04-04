/**
 * Template Processor Service
 *
 * Processes game templates by replacing field placeholders with actual Anki card content.
 * This is the "magic" that turns templates like "{Front}" into actual card data.
 *
 * Key Features:
 * - Dynamic field replacement (any field from Anki note)
 * - Media detection and processing (images, audio)
 * - Conditional visibility (before:: and after:: prefixes)
 * - Autoplay audio support
 * - Layout stability (no height shifts when revealing answers)
 *
 * Template Syntax:
 * - {FieldName} - Always visible
 * - {before::FieldName} - Only visible before answer reveal
 * - {after::FieldName} - Only visible after answer reveal
 * - {autoplay::FieldName} - Audio field that autoplays
 *
 * Media Detection:
 * - Images: <img src="filename.jpg"> → Fetches from Anki and converts to data URL
 * - Audio: [sound:filename.mp3] → Fetches from Anki and creates audio player
 *
 * @example
 * // Template: "<div>{before::Question}</div><div>{after::Answer}</div>"
 * // Before reveal: Shows Question, hides Answer
 * // After reveal: Hides Question, shows Answer
 */

import ankiConnect from "./ankiConnect";
import mediaCacheService from "./mediaCache";
import logger from "../utils/logger";
import { sanitizeGameTemplate } from "../utils/cardTemplates";

class TemplateProcessor {
  /**
   * Process a template by replacing field placeholders with actual content
   *
   * This is the main method that does all the template processing.
   * It's async because it needs to fetch media files from Anki.
   *
   * Processing Steps:
   * 1. Handle before:: fields (conditional visibility)
   * 2. Handle after:: fields (conditional visibility)
   * 3. Process each field in the card:
   *    - Detect media (images, audio)
   *    - Fetch media from Anki
   *    - Replace placeholder with processed content
   * 4. Handle after_hidden:: fields (layout stability)
   * 5. Return processed HTML
   *
   * Layout Stability:
   * - Game templates use invisible divs to reserve space
   * - This prevents content from jumping when answer is revealed
   * - Non-game templates just hide/show content normally
   *
   * @param {string} template - Template string with field placeholders
   * @param {object} cardFields - Card fields object from Anki note
   * @param {object} options - Processing options
   * @param {boolean} options.showAfterFields - Whether to show after:: fields (default: true)
   * @param {boolean} options.isGameTemplate - Whether this is a game template (enables layout shift fix)
   * @returns {Promise<string>} Processed HTML template
   */
  async processTemplate(template, cardFields, options = {}) {
    // Validate inputs
    if (!template || !cardFields) {
      return "";
    }

    const { showAfterFields = true, isGameTemplate = false, skipMedia = false } = options;
    let processedTemplate = template;

    // Track autoplay audio files for game templates
    // These will be played automatically when the card loads
    const autoplayAudioFiles = [];

    // ========== STEP 1: Handle before:: fields ==========
    // These fields are only visible BEFORE the answer is revealed

    if (showAfterFields && isGameTemplate) {
      // CASE: Answer is revealed in a game template
      // Strategy: Replace {before::FieldName} with invisible placeholder
      // Why? To prevent layout shift (content jumping) when hiding
      // The invisible div reserves the same space as the visible content

      const beforeFieldMatches =
        processedTemplate.match(/\{before::([^}]+)\}/g) || [];
      for (const match of beforeFieldMatches) {
        const fieldName = match.replace(/\{before::|}/g, "");
        const fieldValue = this.getFieldValue(cardFields, fieldName);

        // Wrap in invisible div to reserve space
        // aria-hidden="true" tells screen readers to ignore it
        const invisiblePlaceholder = `<div class="invisible" aria-hidden="true">${
          fieldValue || "&nbsp;"
        }</div>`;

        processedTemplate = processedTemplate.replace(
          new RegExp(match.replace(/[{}]/g, "\\$&"), "g"),
          invisiblePlaceholder
        );
      }
    } else if (showAfterFields) {
      // CASE: Answer is revealed in a non-game template (browser)
      // Strategy: Just remove {before::FieldName} placeholders
      // Why? Browser doesn't need layout stability, simpler to just hide
      processedTemplate = processedTemplate.replace(/\{before::[^}]+\}/g, "");
    } else {
      // CASE: Answer is NOT revealed yet
      // Strategy: Convert {before::FieldName} to {FieldName}
      // Why? So they get processed normally and shown
      processedTemplate = processedTemplate.replace(
        /\{before::([^}]+)\}/g,
        "{$1}"
      );
    }

    // ========== STEP 2: Handle after:: fields ==========
    // These fields are only visible AFTER the answer is revealed

    if (!showAfterFields && isGameTemplate) {
      // CASE: Answer is NOT revealed yet in a game template
      // Strategy: Convert to {after_hidden::FieldName} for later processing
      // Why? We'll process the content but wrap it in invisible div (layout stability)
      processedTemplate = processedTemplate.replace(
        /\{after::([^}]+)\}/g,
        "{after_hidden::$1}"
      );
    } else if (!showAfterFields) {
      // CASE: Answer is NOT revealed yet in a non-game template
      // Strategy: Just remove {after::FieldName} placeholders
      processedTemplate = processedTemplate.replace(/\{after::[^}]+\}/g, "");
    } else {
      // CASE: Answer is revealed
      // Strategy: Convert {after::FieldName} to {FieldName}
      // Why? So they get processed normally and shown
      processedTemplate = processedTemplate.replace(
        /\{after::([^}]+)\}/g,
        "{$1}"
      );
    }

    // ========== STEP 3: Process each field in the card ==========
    // Loop through all fields in the Anki note and replace placeholders
    // This is where the "magic" happens - turning {FieldName} into actual content

    for (const [fieldName, fieldData] of Object.entries(cardFields)) {
      const fieldValue = fieldData?.value || "";

      // Check if this field uses autoplay prefix
      // Example: {autoplay::Audio} will autoplay when card loads
      const autoplayPlaceholder = `{autoplay::${fieldName}}`;
      const hasAutoplay = processedTemplate.includes(autoplayPlaceholder);
      const placeholder = hasAutoplay ? autoplayPlaceholder : `{${fieldName}}`;

      // ===== MEDIA TYPE 1: Audio =====
      // Anki stores audio as: [sound:filename.mp3]
      // We convert it to: <audio> HTML element with data URL

      const audioMatch = fieldValue.match(/\[sound:([^\]]+)\]/);
      if (audioMatch && audioMatch[1]) {
        if (skipMedia) {
          // Text-only pass: strip the [sound:...] tag entirely
          processedTemplate = processedTemplate.replace(
            new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
            ""
          );
          continue;
        }
        const audioFilename = audioMatch[1].trim();
        try {
          // Try to get from cache first
          let base64Data = await mediaCacheService.getCachedMedia(
            audioFilename
          );

          // If not in cache, fetch from AnkiConnect
          if (!base64Data) {
            base64Data = await ankiConnect.retrieveMediaFile(audioFilename);

            // Cache the result for future use
            if (base64Data) {
              await mediaCacheService.setCachedMedia(audioFilename, base64Data);
            }
          }

          if (base64Data) {
            // Determine MIME type from file extension
            const extension =
              audioFilename.split(".").pop()?.toLowerCase() || "mp3";
            const mimeType =
              extension === "mp3"
                ? "audio/mpeg"
                : extension === "wav"
                ? "audio/wav"
                : extension === "ogg"
                ? "audio/ogg"
                : extension === "m4a"
                ? "audio/mp4"
                : `audio/${extension}`;

            // Create data URL (embeds audio in HTML)
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            // Build compact audio HTML element
            // Use custom compact player instead of native controls
            const autoplayAttr = hasAutoplay ? " autoplay" : "";
            const audioHTML = `<div class="compact-audio-player-wrapper flex justify-center my-3">
              <button
                class="compact-audio-btn w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
                onclick="this.nextElementSibling.paused ? this.nextElementSibling.play() : this.nextElementSibling.pause(); this.querySelector('svg').style.display = this.nextElementSibling.paused ? 'block' : 'none'; this.querySelectorAll('svg')[1].style.display = this.nextElementSibling.paused ? 'none' : 'block';"
                title="Play audio"
                aria-label="Play audio">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style="display: block;">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style="display: none;">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              </button>
              <audio${autoplayAttr} data-autoplay="${hasAutoplay}" aria-label="Audio pronunciation for ${fieldName}" style="display: none;" onended="this.previousElementSibling.querySelector('svg').style.display='block'; this.previousElementSibling.querySelectorAll('svg')[1].style.display='none';"><source src="${dataUrl}" type="${mimeType}"></audio>
            </div>`;

            // Track autoplay audio for game session
            if (hasAutoplay && isGameTemplate) {
              autoplayAudioFiles.push(audioFilename);
            }

            // Replace placeholder with audio HTML
            processedTemplate = processedTemplate.replace(
              new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
              audioHTML
            );
            continue; // Skip to next field
          }
        } catch (error) {
          logger.error("Failed to load audio:", error);
          // Continue processing - don't break on media load failure
        }
      }

      // ===== MEDIA TYPE 2: Images =====
      // Anki stores images as: <img src="filename.jpg">
      // We convert it to: <img> with data URL and responsive styling

      const imgMatch = fieldValue.match(/<img[^>]+src=["']([^"']+)["']/);
      if (imgMatch && imgMatch[1]) {
        if (skipMedia) {
          // Text-only pass: strip the img tag entirely
          processedTemplate = processedTemplate.replace(
            new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
            ""
          );
          continue;
        }
        const imageFilename = imgMatch[1].trim();
        try {
          // Try to get from cache first
          let base64Data = await mediaCacheService.getCachedMedia(
            imageFilename
          );

          // If not in cache, fetch from AnkiConnect
          if (!base64Data) {
            base64Data = await ankiConnect.retrieveMediaFile(imageFilename);

            // Cache the result for future use
            if (base64Data) {
              await mediaCacheService.setCachedMedia(imageFilename, base64Data);
            }
          }

          if (base64Data) {
            // Determine MIME type from file extension
            const extension =
              imageFilename.split(".").pop()?.toLowerCase() || "png";
            const mimeType =
              extension === "jpg" || extension === "jpeg"
                ? "image/jpeg"
                : `image/${extension}`;

            // Create data URL (embeds image in HTML)
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            // Build image HTML with responsive styling
            // max-w-full: Don't exceed container width
            // max-height: Prevent huge images from breaking layout (300px for cards, scales with container)
            // object-fit: contain: Maintain aspect ratio
            // loading="lazy": Only load when scrolled into view (performance)
            const imageHTML = `<img src="${dataUrl}" alt="${imageFilename}" class="max-w-full h-auto rounded-lg shadow-sm mx-auto my-2 object-contain" style="max-height: 300px;" loading="lazy" />`;

            // Replace placeholder with image HTML
            processedTemplate = processedTemplate.replace(
              new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
              imageHTML
            );
            continue; // Skip to next field
          }
        } catch (error) {
          logger.error("Failed to load image:", error);
          // Continue processing - don't break on media load failure
        }
      }

      // ===== REGULAR TEXT FIELD =====
      // No media detected - just replace placeholder with text value
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        fieldValue
      );

      // ===== HANDLE after_hidden:: PLACEHOLDERS =====
      // These were created in Step 2 for game templates
      // Wrap them in invisible divs to reserve space (layout stability)
      const afterHiddenPlaceholder = `{after_hidden::${fieldName}}`;
      if (processedTemplate.includes(afterHiddenPlaceholder)) {
        const wrappedValue = `<div class="invisible" aria-hidden="true">${
          fieldValue || "&nbsp;"
        }</div>`;
        processedTemplate = processedTemplate.replace(
          new RegExp(afterHiddenPlaceholder.replace(/[{}]/g, "\\$&"), "g"),
          wrappedValue
        );
      }
    }

    // ========== STEP 4: Sanitize and return ==========
    // Remove any potentially dangerous HTML/JavaScript (XSS protection)
    return sanitizeGameTemplate(processedTemplate);
  }

  /**
   * Get field value from card fields object
   *
   * Handles two formats:
   * 1. Object format: { value: "text" }
   * 2. Direct string format: "text"
   *
   * @param {object} cardFields - Card fields object
   * @param {string} fieldName - Field name to get
   * @returns {string} Field value (empty string if not found)
   */
  getFieldValue(cardFields, fieldName) {
    const field = cardFields[fieldName];
    if (!field) return "";

    // Handle object format (from AnkiConnect)
    if (typeof field === "object" && field !== null) {
      return field.value || "";
    }

    // Handle direct string format
    return String(field || "").trim();
  }

}

// Export a singleton instance
// All components use the same instance for consistency
export default new TemplateProcessor();
