/**
 * usePracticeSession
 * Manages the lifecycle of a practice session: phase, current question,
 * answer recording, and the end-of-session confusion report.
 *
 * Question building lives in questionBuilder.js (pure functions).
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { shuffle } from "../components/practice/practiceUtils";
import {
  TYPES,
  TYPE_TO_TAG_CATEGORY,
  getAvailableTypes,
  buildQuestion,
  buildSentenceQuestion,
} from "../components/practice/questionBuilder";
import ankiConnect from "../services/ankiConnect";
import dataService from "../services/dataService";
import logger from "../utils/logger";

// Re-export so existing import sites don't need to change
export { TYPES, EXERCISE_LABELS, PROMPT_LABELS, getAvailableTypes } from "../components/practice/questionBuilder";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Max times a wrong answer is re-queued — prevents truly infinite sessions */
const MAX_REQUEUES = 2;

const SENTENCE_TYPES = [TYPES.SENTENCE_TRANSLATION, TYPES.SENTENCE_DICTATION];

// ─── Helpers ───────────────────────────────────────────────────────────────

const makeResult = (q, correct, gaveUp, pickedOpt) => ({
  noteId:                   q.noteId,
  type:                     q.type,
  _requeues:                q._requeues ?? 0,
  prompt:                   q.prompt,
  answer:                   q.answer,
  word:                     q.word,
  pronunciation:            q.pronunciation,
  meaning:                  q.meaning,
  sentences:                q.sentences ?? [],
  sentenceTranslation:      q.sentenceTranslation ?? "",
  correct,
  gaveUp:                   gaveUp ?? false,
  picked:                   pickedOpt?.text ?? "",
  pickedWord:               pickedOpt?.word ?? "",
  pickedPronunciation:      pickedOpt?.pronunciation ?? "",
  pickedMeaning:            pickedOpt?.meaning ?? "",
  pickedSentences:          pickedOpt?.sentences ?? [],
  pickedSentenceTranslation: pickedOpt?.sentenceTranslation ?? "",
});

const requeueQuestion = (questions, current) => {
  const q = questions[current];
  const count = (q._requeues ?? 0) + 1;
  if (count > MAX_REQUEUES) return questions; // cap reached — don't re-queue
  const insertAt = Math.min(current + 4, questions.length);
  const next = [...questions];
  next.splice(insertAt, 0, { ...q, _requeues: count });
  return next;
};

// ─── Hook ──────────────────────────────────────────────────────────────────

const parseWeakTags = (tags, prefix) => {
  const result = {};
  const re = new RegExp(`^${prefix}::([a-z]+):(\\d+)$`);
  for (const tag of tags) {
    const m = tag.match(re);
    if (m) result[m[1]] = parseInt(m[2], 10);
  }
  return result;
};

export const usePracticeSession = () => {
  const [questions,    setQuestions]    = useState([]);
  const [current,      setCurrent]      = useState(0);
  const [initialTotal, setInitialTotal] = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [revealed,     setRevealed]     = useState(false);
  const [results,      setResults]      = useState([]);
  const [phase,        setPhase]        = useState("idle");

  const [tagSummary,   setTagSummary]   = useState(null);
  const tagStateRef        = useRef({}); // { noteId: { category: level } }
  const tagChangesRef      = useRef({}); // { noteId: { category: { from, to } } }
  const touchedNoteIdsRef  = useRef(new Set());
  const touchedCardsRef    = useRef({});  // { noteId: cardIds[] }
  const updateWeakTagRef   = useRef(null);

  const poolRef            = useRef([]); // all notes (for distractor generation)
  const viewRef            = useRef(null);
  const addConfusedRef     = useRef(false);
  const activeNoteIdsRef   = useRef(new Set()); // noteIds already generating questions

  updateWeakTagRef.current = (noteId, category, correct) => {
    if (!category || !dataService.getSetting("autoPracticeTagging", true)) return;
    const prefix = dataService.getSetting("practiceTagPrefix", "weak");
    const noteState = tagStateRef.current[noteId] ?? {};
    const current = noteState[category] ?? 0;
    const next = correct ? Math.max(0, current - 1) : Math.min(3, current + 1);
    if (current === next) return;

    const oldTag = current > 0 ? `${prefix}::${category}:${current}` : null;
    const newTag = next > 0 ? `${prefix}::${category}:${next}` : null;

    (async () => {
      try {
        if (oldTag) await ankiConnect.removeTags([noteId], oldTag);
        if (newTag) await ankiConnect.addTags([noteId], newTag);

        const updated = { ...(tagStateRef.current[noteId] ?? {}) };
        if (next === 0) delete updated[category];
        else updated[category] = next;
        tagStateRef.current[noteId] = updated;

        if (!tagChangesRef.current[noteId]) tagChangesRef.current[noteId] = {};
        const prev = tagChangesRef.current[noteId][category];
        tagChangesRef.current[noteId][category] = { from: prev?.from ?? current, to: next };

        touchedNoteIdsRef.current.add(noteId);
      } catch (err) {
        logger.warn("Auto-tag update failed:", err);
      }
    })();
  };

  const start = useCallback((baseNotes, pool, exerciseType, view, addConfused = false, sentenceMap = null) => {
    const available = getAvailableTypes(view);
    if (available.length === 0) return;

    // Normalize exerciseType to a per-note resolver — Map mode uses per-card types,
    // string/array mode broadcasts the same types to every note.
    const getTypesForNote = (noteId) => {
      if (exerciseType instanceof Map) return exerciseType.get(noteId) || [];
      const types = Array.isArray(exerciseType)
        ? exerciseType
        : exerciseType === "mixed" ? available : [exerciseType];
      return types.filter((t) => available.includes(t));
    };

    const regularQs = shuffle(
      baseNotes.flatMap((note) =>
        getTypesForNote(note.noteId)
          .filter((t) => !SENTENCE_TYPES.includes(t))
          .map((type) => buildQuestion(note, pool, type, view))
      )
    ).filter(Boolean);

    const sentenceQs = sentenceMap
      ? shuffle(
          [...sentenceMap.entries()].flatMap(([vocabNoteId, sentenceNotes]) => {
            const vocabNote = baseNotes.find((n) => n.noteId === vocabNoteId);
            if (!vocabNote) return [];
            return sentenceNotes.flatMap((sNote) =>
              getTypesForNote(vocabNoteId)
                .filter((t) => SENTENCE_TYPES.includes(t))
                .map((type) => buildSentenceQuestion(sNote, vocabNote, type, view))
            );
          })
        ).filter(Boolean)
      : [];

    const qs = shuffle([...regularQs, ...sentenceQs]);

    if (qs.length === 0) return;

    setQuestions(qs);
    setCurrent(0);
    setInitialTotal(qs.length);
    setSelected(null);
    setRevealed(false);
    setResults([]);
    setPhase("playing");

    // Store refs for confused-word adding
    poolRef.current = pool;
    viewRef.current = view;
    addConfusedRef.current = addConfused;
    activeNoteIdsRef.current = new Set(baseNotes.map((n) => n.noteId));

    // Initialize tag tracking
    const prefix = dataService.getSetting("practiceTagPrefix", "weak");
    tagStateRef.current = {};
    tagChangesRef.current = {};
    touchedNoteIdsRef.current = new Set();
    touchedCardsRef.current = {};
    setTagSummary(null);
    pool.forEach((note) => {
      const id = note.noteId;
      tagStateRef.current[id] = parseWeakTags(note.tags || [], prefix);
      touchedCardsRef.current[id] = note.cards || [];
    });
  }, []);

  /** Flip the recall card to show the answer */
  const reveal = useCallback(() => setRevealed(true), []);

  /** Self-rate a typing or sentence exercise after reveal */
  const selfRate = useCallback((correct) => {
    const q = questions[current];
    setResults((prev) => [...prev, makeResult(q, correct, false, null)]);
    updateWeakTagRef.current(q.noteId, TYPE_TO_TAG_CATEGORY[q.type], correct);
    const shouldRequeue = !correct && (q._requeues ?? 0) < MAX_REQUEUES;
    if (shouldRequeue) setQuestions((prev) => requeueQuestion(prev, current));
    setRevealed(false);
    const next = current + 1;
    const isLast = next >= questions.length;
    if (isLast && !shouldRequeue) setPhase("finished");
    else setCurrent(next);
  }, [questions, current]);

  /** Record a multiple-choice answer. Pass -1 to "give up". Wrong answers are re-queued (up to MAX_REQUEUES times). */
  const answer = useCallback((optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);

    const q        = questions[current];
    const isGaveUp = optionIndex === -1;
    const correct  = !isGaveUp && optionIndex === q.correctIndex;
    const pickedOpt = !isGaveUp ? q.options[optionIndex] : null;

    setResults((prev) => [...prev, makeResult(q, correct, isGaveUp, pickedOpt)]);
    if (!isGaveUp) updateWeakTagRef.current(q.noteId, TYPE_TO_TAG_CATEGORY[q.type], correct);

    if (!correct && !isGaveUp) {
      setQuestions((prev) => {
        let next = requeueQuestion(prev, current);

        // Add the confused note to the question pool (same exercise type only)
        if (!isGaveUp && addConfusedRef.current && pickedOpt?.noteId &&
            !activeNoteIdsRef.current.has(pickedOpt.noteId)) {
          const confusedNote = poolRef.current.find((n) => n.noteId === pickedOpt.noteId);
          if (confusedNote) {
            activeNoteIdsRef.current.add(pickedOpt.noteId);
            const newQ = buildQuestion(confusedNote, poolRef.current, q.type, viewRef.current);
            if (newQ) {
              const insertAt = Math.min(current + 5, next.length);
              next = [...next.slice(0, insertAt), newQ, ...next.slice(insertAt)];
            }
          }
        }

        return next;
      });
    }
  }, [selected, questions, current]);

  /** Advance past a multiple-choice question after reviewing the answer */
  const advance = useCallback(() => {
    const next = current + 1;
    setSelected(null);
    if (next >= questions.length) {
      setPhase("finished");
    } else {
      setCurrent(next);
    }
  }, [current, questions.length]);

  const confusionReport = useMemo(() => {
    if (phase !== "finished") return null;

    const wrongByNote = {};
    results.forEach((r) => {
      if (!r.correct) {
        if (!wrongByNote[r.noteId]) {
          wrongByNote[r.noteId] = {
            noteId: r.noteId, prompt: r.prompt, answer: r.answer,
            word: r.word, pronunciation: r.pronunciation, meaning: r.meaning,
            sentences: r.sentences ?? [], sentenceTranslation: r.sentenceTranslation ?? "",
            errors: 0, wrongPicks: [],
          };
        }
        wrongByNote[r.noteId].errors++;
        if (r.picked && r.pickedWord && !r.gaveUp &&
            !wrongByNote[r.noteId].wrongPicks.some((p) => p.text === r.picked)) {
          wrongByNote[r.noteId].wrongPicks.push({
            text: r.picked, word: r.pickedWord,
            pronunciation: r.pickedPronunciation, meaning: r.pickedMeaning,
            sentences: r.pickedSentences ?? [], sentenceTranslation: r.pickedSentenceTranslation ?? "",
          });
        }
      }
    });

    const confusedWords = Object.values(wrongByNote).sort((a, b) => b.errors - a.errors);
    const score = results.filter((r) => r.correct).length;
    return { score, total: results.length, confusedWords };
  }, [phase, results]);

  // Update flags when session finishes
  useEffect(() => {
    if (phase !== "finished") return;

    const flagOutcomes = { red: 0, orange: 0, cleared: 0 };
    for (const noteId of touchedNoteIdsRef.current) {
      const tagState = tagStateRef.current[noteId] ?? {};
      const maxLevel = Object.values(tagState).reduce((m, v) => Math.max(m, v), 0);
      if (maxLevel >= 3) flagOutcomes.red++;
      else if (maxLevel >= 1) flagOutcomes.orange++;
      else flagOutcomes.cleared++;
    }
    setTagSummary({ flagOutcomes });

    if (!dataService.getSetting("autoPracticeTagging", true)) return;

    (async () => {
      for (const noteId of touchedNoteIdsRef.current) {
        const tagState = tagStateRef.current[noteId] ?? {};
        const maxLevel = Object.values(tagState).reduce((m, v) => Math.max(m, v), 0);
        const flag = maxLevel >= 3 ? 1 : maxLevel >= 1 ? 2 : 0;
        const cardIds = touchedCardsRef.current[noteId] ?? [];
        if (cardIds.length > 0) {
          try {
            await ankiConnect.setFlag(cardIds, flag);
          } catch (err) {
            logger.warn("Flag update failed:", err);
          }
        }
      }
    })();
  }, [phase]);

  const score = results.filter((r) => r.correct).length;

  return {
    phase,
    current,
    selected,
    revealed,
    confusionReport,
    tagSummary,
    start,
    answer,
    advance,
    reveal,
    selfRate,
    currentQuestion: questions[current] ?? null,
    progress: {
      current: current + 1,
      total:   initialTotal,
      extra:   Math.max(0, questions.length - initialTotal),
    },
    score,
    errors: results.length - score,
  };
};
