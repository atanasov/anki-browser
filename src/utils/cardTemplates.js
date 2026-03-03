/**
 * Card Template Utilities
 * Functions for rendering card templates with field substitution
 */

import DOMPurify from "dompurify";
import logger from "./logger";

/**
 * Get fallback content from note fields when template is empty
 * @param {Object} noteFields - Object containing field values
 * @returns {string} - First non-empty field value
 */
export function getFallbackContent(noteFields) {
  if (!noteFields || typeof noteFields !== "object") {
    return "";
  }

  const fieldValues = Object.values(noteFields);

  for (const fieldValue of fieldValues) {
    let value = "";

    if (typeof fieldValue === "object" && fieldValue !== null) {
      value = fieldValue.value || "";
    } else {
      value = String(fieldValue || "");
    }

    // Strip HTML tags for fallback content
    const stripped = value.replace(/<[^>]*>/g, "").trim();
    if (stripped) {
      return stripped;
    }
  }

  return "";
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify for comprehensive sanitization
 * @param {string} html - Raw HTML content
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
  if (!html) return "";

  const defaultConfig = {
    // Allow common formatting tags
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "s",
      "strike",
      "br",
      "p",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "audio",
      "video",
      "source",
      "button", // For audio player buttons
      "svg", // For audio player icons
      "path", // For SVG paths
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "blockquote",
      "hr",
      "sup",
      "sub",
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      "class",
      "style",
      "id",
      "href",
      "target",
      "rel", // For links
      "src",
      "alt",
      "width",
      "height", // For images
      "controls",
      "autoplay",
      "loop",
      "preload", // For audio/video
      "type", // For source elements
      "title", // For tooltips
      "aria-label",
      "aria-hidden",
      "aria-describedby",
      "aria-labelledby", // For accessibility
      "role",
      "tabindex", // For keyboard navigation
      "onclick", // For audio player button functionality
      "onended", // For audio player state management
      "data-autoplay", // For audio autoplay tracking
      "viewBox", // For SVG elements
      "fill", // For SVG styling
      "d", // For SVG path data
    ],
    // Allow data URIs for images and audio (needed for Anki media)
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
    // Keep relative URLs for Anki media
    ALLOW_DATA_ATTR: false,
    // Return string (not DOM)
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    // Don't sanitize in place
    IN_PLACE: false,
  };

  const config = { ...defaultConfig, ...options };

  try {
    return DOMPurify.sanitize(html, config);
  } catch (error) {
    logger.error("HTML sanitization failed:", error);
    // Return empty string on error to be safe
    return "";
  }
}

/**
 * Sanitize HTML for game templates (more restrictive)
 * @param {string} html - Raw HTML content
 * @returns {string} Sanitized HTML
 */
export function sanitizeGameTemplate(html) {
  return sanitizeHtml(html, {
    // More restrictive for user-generated templates
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "br",
      "p",
      "span",
      "div",
      "img",
      "audio",
      "source", // For audio/video sources
      "button", // For compact audio player
      "svg", // For audio player icons
      "path", // For SVG paths
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ],
    ALLOWED_ATTR: [
      "class",
      "style",
      "src",
      "alt", // For images
      "controls",
      "autoplay",
      "preload",
      "loop", // For audio/video
      "type", // For source elements
      "data-autoplay", // Custom data attribute for autoplay tracking
      "width",
      "height",
      "loading", // For lazy loading images
      "aria-label",
      "aria-hidden", // For accessibility
      "onclick", // For compact audio player button
      "onended", // For audio ended event
      "title", // For button tooltips
      "viewBox", // For SVG
      "fill", // For SVG
      "d", // For SVG paths
      "fillRule", // For SVG
      "clipRule", // For SVG
    ],
  });
}

