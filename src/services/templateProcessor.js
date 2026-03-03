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

    const { showAfterFields = true, isGameTemplate = false } = options;
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
   * Process text fields by replacing placeholders with field values
   *
   * Simple helper for text-only fields (no media).
   *
   * @param {string} template - Template string
   * @param {object} cardFields - Card fields object
   * @param {string} fieldName - Field name to process
   * @returns {string} Template with placeholder replaced
   */
  processTextField(template, cardFields, fieldName) {
    const placeholder = `{${fieldName}}`;
    const fieldValue = this.getFieldValue(cardFields, fieldName);

    // Replace all occurrences of the placeholder
    // Escape {} characters in regex to match literal braces
    return template.replace(
      new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
      fieldValue
    );
  }

  /**
   * Process audio fields by replacing placeholders with audio player HTML
   *
   * Creates a custom audio player button (not used in main processTemplate).
   * This is an alternative approach for audio fields.
   *
   * @param {string} template - Template string
   * @param {object} cardFields - Card fields object
   * @param {string} fieldName - Field name to process
   * @returns {string} Template with audio player HTML
   */
  processAudioField(template, cardFields, fieldName) {
    const placeholder = `{${fieldName}}`;
    const fieldValue = this.getFieldValue(cardFields, fieldName);

    if (!fieldValue) {
      // No audio - remove placeholder
      return template.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        ""
      );
    }

    // Extract audio filename from Anki format [sound:filename.mp3]
    const audioFilename = this.extractAudioFilename(fieldValue);

    if (audioFilename) {
      // Create custom audio player button
      // Uses data attribute to store filename for later loading
      const audioPlayerHTML = `<div class="audio-player" data-audio-file="${audioFilename}">
        <button class="audio-play-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Play Audio
        </button>
      </div>`;

      return template.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        audioPlayerHTML
      );
    }

    // No valid audio filename - remove placeholder
    return template.replace(
      new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
      ""
    );
  }

  /**
   * Process image fields by replacing placeholders with image HTML
   *
   * Async helper for image fields (not used in main processTemplate).
   * This is an alternative approach for image fields.
   *
   * @param {string} template - Template string
   * @param {object} cardFields - Card fields object
   * @param {string} fieldName - Field name to process
   * @returns {Promise<string>} Template with image HTML
   */
  async processImageField(template, cardFields, fieldName) {
    const placeholder = `{${fieldName}}`;
    const fieldValue = this.getFieldValue(cardFields, fieldName);

    if (!fieldValue) {
      // No image - remove placeholder
      return template.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        ""
      );
    }

    // Extract image filename from HTML or direct filename
    const imageFilename = this.extractImageFilename(fieldValue);

    if (imageFilename && this.isValidFilename(imageFilename)) {
      try {
        // Try to get from cache first
        let base64Data = await mediaCacheService.getCachedMedia(imageFilename);

        // If not in cache, fetch from AnkiConnect
        if (!base64Data) {
          base64Data = await ankiConnect.retrieveMediaFile(imageFilename);

          // Cache the result for future use
          if (base64Data) {
            await mediaCacheService.setCachedMedia(imageFilename, base64Data);
          }
        }

        if (base64Data) {
          // Determine MIME type from extension
          const extension =
            imageFilename.split(".").pop()?.toLowerCase() || "png";
          const mimeType =
            extension === "jpg" || extension === "jpeg"
              ? "image/jpeg"
              : `image/${extension}`;

          // Create data URL
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          // Build responsive image HTML
          const imageHTML = `<img src="${dataUrl}" alt="${imageFilename}" class="max-w-full h-auto rounded-lg shadow-sm" />`;
          return template.replace(
            new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
            imageHTML
          );
        }
      } catch (error) {
        logger.error("Failed to load image:", error);
      }
    }

    // Failed to load or invalid filename - remove placeholder
    return template.replace(
      new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
      ""
    );
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

  /**
   * Extract audio filename from Anki audio field format
   *
   * Supports multiple formats:
   * 1. Anki format: [sound:filename.mp3]
   * 2. HTML format: <audio src="filename.mp3">
   * 3. Direct filename: filename.mp3
   *
   * @param {string} fieldValue - Field value to extract from
   * @returns {string} Audio filename (empty string if not found)
   */
  extractAudioFilename(fieldValue) {
    if (!fieldValue) return "";

    // Match [sound:filename.mp3] format (Anki's standard)
    const soundMatch = fieldValue.match(/\[sound:([^\]]+)\]/);
    if (soundMatch && soundMatch[1]) {
      return soundMatch[1].trim();
    }

    // Match HTML audio tag src attribute
    const audioSrcMatch = fieldValue.match(/src=["']([^"']+)["']/);
    if (audioSrcMatch && audioSrcMatch[1]) {
      return audioSrcMatch[1].trim();
    }

    // Return as-is if it looks like a valid filename
    if (this.isValidFilename(fieldValue)) {
      return fieldValue.trim();
    }

    return "";
  }

  /**
   * Extract image filename from HTML img tag or direct filename
   *
   * Supports multiple formats:
   * 1. HTML format: <img src="filename.jpg">
   * 2. Direct filename: filename.jpg
   *
   * @param {string} fieldValue - Field value to extract from
   * @returns {string} Image filename (empty string if not found)
   */
  extractImageFilename(fieldValue) {
    if (!fieldValue) return "";

    // Match HTML img tag src attribute
    const imgSrcMatch = fieldValue.match(/src=["']([^"']+)["']/);
    if (imgSrcMatch && imgSrcMatch[1]) {
      return imgSrcMatch[1].trim();
    }

    // Return as-is if it looks like a valid filename
    if (this.isValidFilename(fieldValue)) {
      return fieldValue.trim();
    }

    return "";
  }

  /**
   * Validate if a string is a valid filename
   *
   * Checks for common issues:
   * - Empty or whitespace-only strings
   * - Directory paths (ending with /)
   * - Full paths (containing /collection.media/)
   * - Missing file extension
   *
   * @param {string} filename - Filename to validate
   * @returns {boolean} true if valid filename, false otherwise
   */
  isValidFilename(filename) {
    if (!filename || typeof filename !== "string") return false;

    const trimmed = filename.trim();

    // Check if it's empty or just whitespace
    if (!trimmed) return false;

    // Check if it ends with a slash (directory path, not a file)
    if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return false;

    // Check if it contains path separators (full path, not just filename)
    // We only want filenames, not paths
    const hasPathSeparators =
      trimmed.includes("/collection.media/") ||
      trimmed.includes("\\collection.media\\");
    if (hasPathSeparators) return false;

    // Check if it has a file extension (e.g., .mp3, .jpg, .png)
    const hasExtension = /\.[a-zA-Z0-9]{2,4}$/.test(trimmed);
    if (!hasExtension) return false;

    return true;
  }

  /**
   * Generate multiple choice options for a template
   *
   * Used by multiple choice games to create answer options.
   *
   * Flow:
   * 1. Process correct card with template
   * 2. Process wrong cards with template
   * 3. Shuffle all choices together
   *
   * @param {object} correctCard - The correct card
   * @param {array} wrongCards - Array of wrong cards
   * @param {string} template - Template string to process
   * @param {object} settings - Game settings (wrongAnswerCount, etc.)
   * @param {object} options - Processing options (showAfterFields, etc.)
   * @returns {Promise<Array>} Shuffled array of choice objects
   */
  async generateChoices(
    correctCard,
    wrongCards,
    template,
    settings,
    options = {}
  ) {
    const choices = [];

    // Process correct answer content using template
    const correctContent = await this.processTemplate(
      template,
      correctCard.fields,
      options
    );

    // Add correct answer to choices
    const correctChoice = {
      id: correctCard.note_id,
      content: correctContent,
      isCorrect: true,
    };
    choices.push(correctChoice);

    // Add wrong answers (limited by settings and available cards)
    const wrongAnswersNeeded = Math.min(
      settings.wrongAnswerCount,
      wrongCards.length
    );
    for (let i = 0; i < wrongAnswersNeeded; i++) {
      const wrongCard = wrongCards[i];
      const wrongContent = await this.processTemplate(
        template,
        wrongCard.fields,
        options
      );
      const wrongChoice = {
        id: wrongCard.note_id,
        content: wrongContent,
        isCorrect: false,
      };
      choices.push(wrongChoice);
    }

    // Shuffle choices so correct answer isn't always first
    return this.shuffleArray(choices);
  }

  /**
   * Generate multiple choice options using specific field values
   *
   * Simpler version that uses raw field values instead of templates.
   * Used when you want plain text choices without HTML formatting.
   *
   * @param {object} correctCard - The correct card
   * @param {array} wrongCards - Array of wrong cards
   * @param {string} fieldName - Field name to use for choices
   * @param {object} settings - Game settings (wrongAnswerCount, etc.)
   * @returns {Array} Shuffled array of choice objects
   */
  generateFieldChoices(correctCard, wrongCards, fieldName, settings) {
    const choices = [];

    // Add correct answer
    const correctValue = this.getFieldValue(correctCard.fields, fieldName);
    if (correctValue) {
      choices.push({
        id: correctCard.note_id,
        content: correctValue,
        isCorrect: true,
      });
    }

    // Add wrong answers (limited by settings and available cards)
    const wrongAnswersNeeded = Math.min(
      settings.wrongAnswerCount,
      wrongCards.length
    );
    for (let i = 0; i < wrongAnswersNeeded; i++) {
      const wrongCard = wrongCards[i];
      const wrongValue = this.getFieldValue(wrongCard.fields, fieldName);
      // Only add if value exists and is different from correct answer
      if (wrongValue && wrongValue !== correctValue) {
        choices.push({
          id: wrongCard.note_id,
          content: wrongValue,
          isCorrect: false,
        });
      }
    }

    // Shuffle choices so correct answer isn't always first
    return this.shuffleArray(choices);
  }

  /**
   * Strip HTML tags from content for plain text display
   *
   * Used for showing correct answers in explanations without HTML formatting.
   * Also decodes common HTML entities.
   *
   * @param {string} html - HTML string to strip
   * @returns {string} Plain text without HTML tags
   */
  stripHtml(html) {
    if (!html) return "";

    // Remove HTML tags and decode common entities
    return html
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&nbsp;/g, " ") // Non-breaking space → regular space
      .replace(/&amp;/g, "&") // Ampersand entity → &
      .replace(/&lt;/g, "<") // Less than entity → <
      .replace(/&gt;/g, ">") // Greater than entity → >
      .replace(/&quot;/g, '"') // Quote entity → "
      .trim();
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   *
   * This is the standard algorithm for unbiased shuffling.
   * Used to randomize multiple choice options.
   *
   * How it works:
   * - Start from the end of the array
   * - For each position, pick a random element from 0 to current position
   * - Swap the current element with the randomly picked element
   *
   * @param {Array} array - Array to shuffle
   * @returns {Array} New shuffled array (original is not modified)
   */
  shuffleArray(array) {
    const shuffled = [...array]; // Create copy to avoid mutating original
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements at positions i and j
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validate if a template can be used with given card fields
   *
   * Checks if all field placeholders in the template have values in the card.
   * Used to detect template errors before rendering.
   *
   * @param {string} template - Template string to validate
   * @param {object} cardFields - Card fields object
   * @returns {object} Validation result with valid flag and missingFields array
   *
   * @example
   * const result = templateProcessor.validateTemplate(
   *   "{Front} {Back}",
   *   { Front: { value: "Hello" } }
   * );
   * // result = { valid: false, missingFields: ["Back"] }
   */
  validateTemplate(template, cardFields) {
    if (!template || !cardFields) {
      return { valid: false, missingFields: [] };
    }

    const missingFields = [];
    // Find all field placeholders in template
    const fieldPlaceholders = template.match(/{([^}]+)}/g) || [];

    fieldPlaceholders.forEach((placeholder) => {
      // Extract field name from {FieldName}
      const fieldName = placeholder.replace(/[{}]/g, "");
      const fieldValue = this.getFieldValue(cardFields, fieldName);

      // Check if field has a value
      if (!fieldValue) {
        missingFields.push(fieldName);
      }
    });

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Get all field placeholders used in a template
   *
   * Extracts field names from {FieldName} placeholders.
   * Used to show which fields are used in a template.
   *
   * @param {string} template - Template string
   * @returns {string[]} Array of field names (without braces)
   *
   * @example
   * getTemplateFields("{Front} {Back} {Audio}")
   * // Returns: ["Front", "Back", "Audio"]
   */
  getTemplateFields(template) {
    if (!template) return [];

    // Find all field placeholders in template
    const fieldPlaceholders = template.match(/{([^}]+)}/g) || [];

    // Extract field names (remove braces)
    return fieldPlaceholders.map((placeholder) =>
      placeholder.replace(/[{}]/g, "")
    );
  }
}

// Export a singleton instance
// All components use the same instance for consistency
export default new TemplateProcessor();
