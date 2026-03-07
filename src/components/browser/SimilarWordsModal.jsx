/**
 * Similar Words Modal
 * Shows words from the configured deck that share characters with the current word.
 * Columns = one per character in the word.
 */

import { useState, useEffect, useCallback } from "react";
import Modal from "../common/Modal";
import ankiConnect from "../../services/ankiConnect";
import { extractFieldValue } from "../../utils/fieldHelpers";
import logger from "../../utils/logger";

const SimilarWordsModal = ({ isOpen, onClose, note, config }) => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [studiedOnly, setStudiedOnly] = useState(false);
  const [error, setError] = useState(null);

  const rawWord = extractFieldValue(note?.fields?.[config?.wordField]);
  const word = rawWord.replace(/<[^>]*>/g, "").trim();
  // Only keep actual Hanzi/meaningful characters, skip spaces and punctuation
  const characters = word
    ? [...new Set([...word])].filter((c) => /\S/.test(c) && c !== "·" && c !== "、")
    : [];

  const fetchResults = useCallback(async () => {
    if (!word || characters.length === 0) return;
    setLoading(true);
    setError(null);
    const newResults = {};

    try {
      await Promise.all(
        characters.map(async (char) => {
          let query = `deck:"${config.deck}" note:"${config.noteType}" ${config.wordField}:*${char}*`;
          if (studiedOnly) query += " (is:review or is:learn)";

          const noteIds = await ankiConnect.findNotes(query);
          if (!noteIds?.length) {
            newResults[char] = [];
            return;
          }
          const notes = await ankiConnect.getNotesInfo(noteIds);
          newResults[char] = notes.filter((n) => {
            const val = extractFieldValue(n.fields?.[config.wordField])
              .replace(/<[^>]*>/g, "")
              .trim();
            return val !== word;
          });
        })
      );
      setResults(newResults);
    } catch (err) {
      logger.error("Failed to fetch similar words:", err);
      setError("Failed to fetch similar words. Make sure Anki is running.");
    } finally {
      setLoading(false);
    }
  }, [word, config, studiedOnly]);

  useEffect(() => {
    if (!isOpen || !word) return;
    fetchResults();
  }, [isOpen, fetchResults]);

  const getText = (n, fieldName) => {
    if (!fieldName) return "";
    return extractFieldValue(n?.fields?.[fieldName])
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Similar Words: ${word}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Studied only toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStudiedOnly((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              studiedOnly ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
            role="switch"
            aria-checked={studiedOnly}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                studiedOnly ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Studied only
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin w-6 h-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : characters.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No word to search — check the Word Field setting in your view.
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${characters.length}, minmax(0, 1fr))`,
            }}
          >
            {characters.map((char) => (
              <div
                key={char}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col"
              >
                {/* Column header */}
                <div className="bg-gray-50 dark:bg-gray-800/80 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {char}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {results[char]?.length ?? "…"}
                  </span>
                </div>

                {/* Results list */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-72 overflow-y-auto">
                  {!results[char] || results[char].length === 0 ? (
                    <div className="px-3 py-5 text-xs text-gray-400 dark:text-gray-500 text-center">
                      No matches
                    </div>
                  ) : (
                    results[char].map((n) => (
                      <div
                        key={n.noteId}
                        className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {getText(n, config.wordField)}
                        </div>
                        {config.pinyinField && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            {getText(n, config.pinyinField)}
                          </div>
                        )}
                        {config.translationField && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {getText(n, config.translationField)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SimilarWordsModal;
