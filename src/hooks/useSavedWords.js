/**
 * useSavedWords
 * Shared hook for adding/removing saved words and background AnkiConnect lookup.
 */

import { useCallback } from "react";
import useStore from "../store";
import ankiConnect from "../services/ankiConnect";

export function useSavedWords() {
  const savedWords = useStore((s) => s.savedWords ?? []);
  const _add = useStore((s) => s.addSavedWord);
  const updateSavedWord = useStore((s) => s.updateSavedWord);
  const removeSavedWord = useStore((s) => s.removeSavedWord);

  const addWord = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (savedWords.some((w) => w.text === trimmed)) return false;
      const entry = _add(trimmed);
      // Background status lookup
      try {
        updateSavedWord(entry.id, { status: "loading" });
        const noteIds = await ankiConnect.findNotes(trimmed);
        updateSavedWord(entry.id, { status: noteIds.length > 0 ? "found" : "not_found" });
      } catch {
        updateSavedWord(entry.id, { status: "unknown" });
      }
      return true;
    },
    [savedWords, _add, updateSavedWord]
  );

  return { savedWords, addWord, updateSavedWord, removeSavedWord };
}
