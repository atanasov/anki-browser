/**
 * Field Helper Utilities
 * Functions for extracting and processing Anki field values
 */

/**
 * Extract value from an Anki field
 * Handles both object format {value: "..."} and string format
 */
export function extractFieldValue(field) {
  if (!field) return '';
  if (typeof field === 'object' && field !== null) return field.value || '';
  return String(field).trim();
}
