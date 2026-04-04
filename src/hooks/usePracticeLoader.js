/**
 * usePracticeLoader
 * Handles the async data-loading sequence before a practice session starts:
 *   1. Fetch base notes
 *   2. Expand pool with similar words (optional)
 *   3. Fetch sentence-deck notes for sentence exercise types (optional)
 *   4. Build per-card exercise type map when weak filter is active
 */

import { useState, useCallback } from "react";
import ankiConnect from "../services/ankiConnect";
import dataService from "../services/dataService";
import { extractFieldValue } from "../utils/fieldHelpers";
import { TYPES, getAvailableTypes, TYPE_TO_TAG_CATEGORY } from "../components/practice/questionBuilder";
import logger from "../utils/logger";

const SENTENCE_TYPES = [TYPES.SENTENCE_TRANSLATION, TYPES.SENTENCE_DICTATION];

const getWeakTagCategories = (notes, noteIds, prefix) => {
  const re = new RegExp(`^${prefix}::([a-z]+):\\d+$`);
  const relevant = noteIds?.length > 0 ? notes.filter((n) => noteIds.includes(n.note_id)) : notes;
  const cats = new Set();
  for (const note of relevant) {
    for (const tag of note.tags || []) {
      const m = tag.match(re);
      if (m) cats.add(m[1]);
    }
  }
  return cats;
};

export const usePracticeLoader = ({ view, noteIds, notes, weakFilter, selectedTypes }) => {
  const [loading,       setLoading]       = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error,         setError]         = useState(null);

  const load = useCallback(async ({
    includeSimilar,
    studiedOnly,
    addConfused,
    onSuccess,
  }) => {
    setLoading(true);
    setError(null);

    try {
      // ── Step 1: fetch base notes ───────────────────────────────────────
      setLoadingStatus("Loading cards…");
      if (!noteIds?.length) {
        setError("No cards found. Check your query.");
        setLoading(false);
        return;
      }
      const baseNotes = await ankiConnect.getNotesInfo(noteIds);

      // ── Step 2: expand with similar words ─────────────────────────────
      let allNotes = baseNotes;
      const hasSimilarWordsConfig = view?.similarWords?.enabled && view?.similarWords?.wordField;

      if (includeSimilar && hasSimilarWordsConfig) {
        setLoadingStatus("Finding similar words…");
        const sw         = view.similarWords;
        const searchDeck = sw.deck || view.deck;
        const searchNote = sw.noteType || view.noteType;
        const knownIds   = new Set(noteIds.map(String));
        const newIds     = new Set();

        for (const note of baseNotes) {
          const word = extractFieldValue(note.fields?.[sw.wordField])
            .replace(/<[^>]*>/g, "").trim();
          if (!word) continue;

          for (const char of [...new Set([...word])]) {
            let q = `deck:"${searchDeck}" note:"${searchNote}" ${sw.wordField}:*${char}*`;
            if (studiedOnly) q += " (is:review or is:learn)";
            try {
              const ids = await ankiConnect.findNotes(q);
              ids.forEach((id) => { if (!knownIds.has(String(id))) newIds.add(id); });
            } catch {
              // skip failed character queries silently
            }
          }
        }

        if (newIds.size > 0) {
          setLoadingStatus(`Loading ${newIds.size} similar words…`);
          const extra = await ankiConnect.getNotesInfo([...newIds]);
          allNotes = [...baseNotes, ...extra];
        }
      }

      // ── Step 3: fetch sentence-deck notes ─────────────────────────────
      let sentenceMap = null;
      const ex = view?.examples;
      const needsSentences = weakFilter
        ? (() => {
            const prefix = dataService.getSetting("practiceTagPrefix", "weak");
            const re = new RegExp(`^${prefix}::([a-z]+):\\d+$`);
            const sentenceCategories = new Set(SENTENCE_TYPES.map((t) => TYPE_TO_TAG_CATEGORY[t]).filter(Boolean));
            return baseNotes.some((note) =>
              (note.tags || []).some((tag) => { const m = tag.match(re); return m && sentenceCategories.has(m[1]); })
            );
          })()
        : selectedTypes.some((t) => SENTENCE_TYPES.includes(t));

      if (needsSentences && ex?.enabled && ex?.deck && ex?.wordField && ex?.sentenceField) {
        setLoadingStatus("Loading example sentences…");
        sentenceMap = new Map();
        const maxSentences = ex.maxSentences || 3;

        for (const note of baseNotes) {
          const word = extractFieldValue(note.fields?.[ex.wordField])
            .replace(/<[^>]*>/g, "").trim();
          if (!word) continue;

          let query = `deck:"${ex.deck}" ${ex.sentenceField}:*${word}*`;
          if (ex.noteType) query += ` note:"${ex.noteType}"`;

          try {
            const ids = await ankiConnect.findNotes(query);
            if (ids.length > 0) {
              const sentenceNotes = await ankiConnect.getNotesInfo(ids.slice(0, maxSentences));
              if (sentenceNotes.length > 0) sentenceMap.set(note.noteId, sentenceNotes);
            }
          } catch {
            // skip if fetch fails for this word
          }
        }
      }

      // ── Step 4: per-card exercise type map (weak filter mode) ─────────
      const availableTypes = getAvailableTypes(view);
      let resolvedExerciseType = selectedTypes;

      if (weakFilter) {
        const prefix = dataService.getSetting("practiceTagPrefix", "weak");
        const re = new RegExp(`^${prefix}::([a-z]+):\\d+$`);
        const perCardMap = new Map();
        for (const note of baseNotes) {
          const cats = new Set();
          for (const tag of note.tags || []) {
            const m = tag.match(re);
            if (m) cats.add(m[1]);
          }
          if (cats.size > 0) {
            const types = availableTypes.filter((t) => {
              const cat = TYPE_TO_TAG_CATEGORY[t];
              return cat && cats.has(cat);
            });
            if (types.length > 0) perCardMap.set(note.noteId, types);
          }
        }
        if (perCardMap.size > 0) resolvedExerciseType = perCardMap;
      }

      onSuccess({
        baseNotes,
        pool: allNotes,
        exerciseType: resolvedExerciseType,
        view,
        addConfused: includeSimilar && addConfused,
        sentenceMap,
      });
    } catch (err) {
      logger.error("Practice setup failed:", err);
      setError("Failed to load cards. Make sure Anki is running.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  }, [view, noteIds, notes, weakFilter, selectedTypes]);

  const getWeakCategories = useCallback(() => {
    if (!weakFilter || !notes?.length) return new Set();
    const prefix = dataService.getSetting("practiceTagPrefix", "weak");
    return getWeakTagCategories(notes, noteIds, prefix);
  }, [weakFilter, notes, noteIds]);

  return { load, loading, loadingStatus, error, setError, getWeakCategories };
};
