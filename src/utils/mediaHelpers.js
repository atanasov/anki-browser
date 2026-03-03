/**
 * Media Helper Utilities
 * Functions for handling media files (images, audio) in Anki cards
 */

/**
 * Validate if a string is a valid filename (not a directory path)
 * @param {string} filename - Filename to validate
 * @returns {boolean} - True if valid filename
 */
export function isValidFilename(filename) {
  if (!filename || typeof filename !== 'string') return false;

  const trimmed = filename.trim();

  // Check if it's empty or just whitespace
  if (!trimmed) return false;

  // Check if it ends with a slash (directory path)
  if (trimmed.endsWith('/') || trimmed.endsWith('\\')) return false;

  // Check if it contains path separators indicating it's a full path
  // Allow single filename with extension
  const hasPathSeparators = trimmed.includes('/collection.media/') ||
                            trimmed.includes('\\collection.media\\');
  if (hasPathSeparators) return false;

  // Check if it has a file extension
  const hasExtension = /\.[a-zA-Z0-9]{2,4}$/.test(trimmed);
  if (!hasExtension) return false;

  return true;
}

/**
 * Extract image filename from field value
 * Handles HTML img tags and raw filenames
 * @param {string} fieldValue - Field value containing image reference
 * @returns {string} - Extracted filename or empty string
 */
export function extractImageFilename(fieldValue) {
  if (!fieldValue) return '';

  const rawValue = String(fieldValue).trim();

  // Extract filename from HTML img tag if present
  // Example: <img src="filename.jpg" /> -> filename.jpg
  const imgSrcMatch = rawValue.match(/src=["']([^"']+)["']/);
  if (imgSrcMatch && imgSrcMatch[1]) {
    return imgSrcMatch[1].trim();
  }

  return rawValue;
}

/**
 * Extract audio filename from field value
 * Handles [sound:] tags, HTML audio tags, and raw filenames
 * @param {string} fieldValue - Field value containing audio reference
 * @returns {string} - Extracted filename or empty string
 */
export function extractAudioFilename(fieldValue) {
  if (!fieldValue) return '';

  const rawValue = String(fieldValue).trim();

  // Extract filename from [sound:] tag if present
  // Example: [sound:filename.mp3] -> filename.mp3
  const soundMatch = rawValue.match(/\[sound:([^\]]+)\]/);
  if (soundMatch && soundMatch[1]) {
    return soundMatch[1].trim();
  }

  // Extract filename from HTML audio tag if present
  // Example: <audio src="filename.mp3" /> -> filename.mp3
  const audioSrcMatch = rawValue.match(/src=["']([^"']+)["']/);
  if (audioSrcMatch && audioSrcMatch[1]) {
    return audioSrcMatch[1].trim();
  }

  return rawValue;
}

/**
 * Get MIME type for image based on file extension
 * @param {string} filename - Image filename
 * @returns {string} - MIME type
 */
export function getImageMimeType(filename) {
  if (!filename) return 'image/png';

  const extension = filename.split('.').pop()?.toLowerCase() || 'png';
  
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }
  
  return `image/${extension}`;
}

/**
 * Get MIME type for audio based on file extension
 * @param {string} filename - Audio filename
 * @returns {string} - MIME type
 */
export function getAudioMimeType(filename) {
  if (!filename) return 'audio/mpeg';

  const extension = filename.split('.').pop()?.toLowerCase() || 'mp3';
  
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };

  return mimeTypes[extension] || `audio/${extension}`;
}

/**
 * Create a data URL from base64 data and MIME type
 * @param {string} base64Data - Base64 encoded data
 * @param {string} mimeType - MIME type
 * @returns {string} - Data URL
 */
export function createMediaDataUrl(base64Data, mimeType) {
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Create a CSS background image URL from base64 data and MIME type
 * @param {string} base64Data - Base64 encoded data
 * @param {string} mimeType - MIME type
 * @returns {string} - CSS url() value
 */
export function createBackgroundImageUrl(base64Data, mimeType) {
  return `url("data:${mimeType};base64,${base64Data}")`;
}

