/**
 * Card Info Modal Component
 * Displays detailed card information (MVP: Fields, Tags, Metadata only)
 */

import Modal from "../common/Modal";
import ankiConnect from "../../services/ankiConnect";
import logger from "../../utils/logger";

const CardInfoModal = ({ isOpen, onClose, note }) => {
  if (!note) return null;

  // Get field value helper
  const getFieldValue = (fieldName) => {
    const field = note.fields?.[fieldName];
    if (!field) return "";

    let value = "";
    if (typeof field === "object" && field !== null) {
      value = field.value || "";
    } else {
      value = String(field || "");
    }

    // Remove HTML tags for display
    return value.replace(/<[^>]*>/g, "").trim();
  };

  const handleOpenInAnki = async () => {
    try {
      await ankiConnect.guiBrowse(`nid:${note.note_id}`);
    } catch (err) {
      logger.error("Failed to open in Anki:", err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Card Information">
      <div className="space-y-4">
        {/* Card Fields - 2 Column Grid */}
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Fields
          </h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {note.fields &&
              Object.entries(note.fields).map(([fieldName]) => {
                const displayValue = getFieldValue(fieldName);
                if (!displayValue) return null;

                return (
                  <div key={fieldName} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {fieldName}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 break-words">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Tags & Metadata - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tags
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex flex-wrap gap-1.5">
                {note.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          <section>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Metadata
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-gray-600 dark:text-gray-400 font-semibold">
                  Note ID
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-mono break-all">
                  {note.noteId}
                </span>
              </div>
              {note.modelName && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">
                    Note Type
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 break-words">
                    {note.modelName}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={handleOpenInAnki}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Open this card in Anki's browser"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in Anki
        </button>
      </div>
    </Modal>
  );
};

export default CardInfoModal;
