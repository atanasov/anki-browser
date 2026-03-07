/**
 * PracticeSetupModal
 * Step 1: choose card source + include similar words
 * Step 2: choose exercise type
 * → emits onStart({ notes, exerciseType, view })
 */

import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import ankiConnect from "../../services/ankiConnect";
import { extractFieldValue } from "../../utils/fieldHelpers";
import {
  getAvailableTypes,
  EXERCISE_LABELS,
} from "../../hooks/usePracticeSession";
import useStore from "../../store";
import logger from "../../utils/logger";

const Toggle = ({ value, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
      value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
    }`}
    role="switch"
    aria-checked={value}
    aria-label={label}
  >
    <span
      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
        value ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

const PracticeSetupModal = ({ isOpen, onClose, onStart, view, selectedNoteIds }) => {
  const currentPageNoteIds = useStore((state) => state.currentPageNoteIds);

  const [source,         setSource]        = useState("page");
  const [includeSimilar, setIncludeSimilar] = useState(true);
  const [studiedOnly,    setStudiedOnly]    = useState(true);
  const [exerciseType,   setExerciseType]   = useState("mixed");
  const [loading,        setLoading]        = useState(false);
  const [loadingStatus,  setLoadingStatus]  = useState("");
  const [error,          setError]          = useState(null);

  const hasSelection          = selectedNoteIds.length > 0;
  const hasPage               = currentPageNoteIds.length > 0;
  const hasSimilarWordsConfig = view?.similarWords?.enabled && view?.similarWords?.wordField;
  const availableTypes        = getAvailableTypes(view);

  // Fall back to page if selection is cleared
  useEffect(() => {
    if (source === "selected" && !hasSelection) setSource("page");
  }, [hasSelection, isOpen]);

  // Default exercise type to first available on open
  useEffect(() => {
    if (!isOpen) return;
    if (availableTypes.length > 0) setExerciseType("mixed");
    setError(null);
    setLoadingStatus("");
  }, [isOpen]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      // ── Step 1: fetch base notes ──────────────────────────────────────
      setLoadingStatus("Loading cards…");
      const baseIds = source === "selected" ? selectedNoteIds : currentPageNoteIds;

      if (!baseIds?.length) {
        setError("No cards found. Try changing the source or check your query.");
        setLoading(false);
        return;
      }

      let baseNotes = await ankiConnect.getNotesInfo(baseIds);

      // ── Step 2: expand with similar words ────────────────────────────
      let allNotes = baseNotes;

      if (includeSimilar && hasSimilarWordsConfig) {
        setLoadingStatus("Finding similar words…");
        const sw          = view.similarWords;
        const searchDeck  = sw.deck || view.deck;
        const searchNote  = sw.noteType || view.noteType;
        const knownIds    = new Set(baseIds.map(String));
        const newIds      = new Set();

        for (const note of baseNotes) {
          const word = extractFieldValue(note.fields?.[sw.wordField])
            .replace(/<[^>]*>/g, "")
            .trim();
          if (!word) continue;

          for (const char of [...new Set([...word])]) {
            let q = `deck:"${searchDeck}" note:"${searchNote}" ${sw.wordField}:*${char}*`;
            if (studiedOnly) q += " (is:review or is:learn)";

            try {
              const ids = await ankiConnect.findNotes(q);
              ids.forEach((id) => {
                if (!knownIds.has(String(id))) newIds.add(id);
              });
            } catch {
              // Skip failed character queries silently
            }
          }
        }

        if (newIds.size > 0) {
          setLoadingStatus(`Loading ${newIds.size} similar words…`);
          const extra = await ankiConnect.getNotesInfo([...newIds]);
          allNotes = [...baseNotes, ...extra];
        }
      }

      onStart({ notes: allNotes, exerciseType, view });
    } catch (err) {
      logger.error("Practice setup failed:", err);
      setError("Failed to load cards. Make sure Anki is running.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Practice" maxWidth="max-w-md">
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Source ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cards to practice
          </p>
          <div className="flex flex-col gap-2">
            <label className={`flex items-center gap-3 ${hasPage ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
              <input
                type="radio"
                name="source"
                value="page"
                checked={source === "page"}
                onChange={() => setSource("page")}
                disabled={!hasPage}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                Current page
                {hasPage && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({currentPageNoteIds.length} cards)
                  </span>
                )}
              </span>
            </label>
            <label
              className={`flex items-center gap-3 ${hasSelection ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
            >
              <input
                type="radio"
                name="source"
                value="selected"
                checked={source === "selected"}
                onChange={() => setSource("selected")}
                disabled={!hasSelection}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                Selected cards only
                {hasSelection && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({selectedNoteIds.length})
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* ── Similar words ───────────────────────────────────────────── */}
        {hasSimilarWordsConfig && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include similar words
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Adds words sharing the same characters — great for contrast practice
                </p>
              </div>
              <Toggle
                value={includeSimilar}
                onChange={setIncludeSimilar}
                label="Include similar words"
              />
            </div>

            {includeSimilar && (
              <div className="flex items-center justify-between pl-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Studied cards only (is:review or is:learn)
                </span>
                <Toggle
                  value={studiedOnly}
                  onChange={setStudiedOnly}
                  label="Studied only"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Exercise type ────────────────────────────────────────────── */}
        {availableTypes.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exercise type
            </p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="exerciseType"
                  value="mixed"
                  checked={exerciseType === "mixed"}
                  onChange={() => setExerciseType("mixed")}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {EXERCISE_LABELS.mixed}
                  <span className="ml-1 text-xs text-gray-400">
                    (recommended)
                  </span>
                </span>
              </label>
              {availableTypes.map((t) => (
                <label key={t} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exerciseType"
                    value={t}
                    checked={exerciseType === t}
                    onChange={() => setExerciseType(t)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {EXERCISE_LABELS[t]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {availableTypes.length === 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
            Configure the <strong>Word</strong>, <strong>Pinyin</strong>, and{" "}
            <strong>Translation</strong> fields in Similar Words settings to enable
            practice exercises.
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading || availableTypes.length === 0}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{loadingStatus || "Loading…"}</span>
              </>
            ) : (
              "Start Practice"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PracticeSetupModal;
