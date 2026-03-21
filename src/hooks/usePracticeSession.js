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
  getAvailableTypes,
  buildQuestion,
} from "../components/practice/questionBuilder";
import ankiConnect from "../services/ankiConnect";
import dataService from "../services/dataService";
import logger from "../utils/logger";
import { TYPE_TO_TAG_CATEGORY } from "../components/practice/questionBuilder";

// Re-export so existing import sites don't need to change
export { TYPES, EXERCISE_LABELS, PROMPT_LABELS, getAvailableTypes } from "../components/practice/questionBuilder";
// Also expose MULTISTEP for PracticeSession UI

// ─── Constants ─────────────────────────────────────────────────────────────

/** Max times a wrong answer is re-queued — prevents truly infinite sessions */
const MAX_REQUEUES = 2;

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

  const [drillStep,    setDrillStep]    = useState(1); // 1 or 2 for MULTISTEP questions

  const [tagSummary,   setTagSummary]   = useState(null);
  const tagStateRef        = useRef({}); // { noteId: { category: level } }
  const tagChangesRef      = useRef({}); // { noteId: { category: { from, to } } }
  const touchedNoteIdsRef  = useRef(new Set());
  const touchedCardsRef    = useRef({});  // { noteId: cardIds[] }
  const updateWeakTagRef   = useRef(null);
  const drillStep1CorrectRef = useRef(true); // tracks step 1 result for re-queue logic in step 2

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

  const start = useCallback((baseNotes, pool, exerciseType, view, addConfused = false) => {
    const available = getAvailableTypes(view);
    if (available.length === 0) return;

    const types = Array.isArray(exerciseType)
      ? exerciseType.filter((t) => available.includes(t))
      : exerciseType === "mixed" ? available : [exerciseType];
    if (types.length === 0) return;
    const qs = shuffle(
      baseNotes.flatMap((note) =>
        types.map((type) => buildQuestion(note, pool, type, view))
      )
    ).filter(Boolean);

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

  /** Self-rate a multi-step drill card (two steps: pronunciation then meaning) */
  const selfRate = useCallback((correct) => {
    const q = questions[current];

    // Typing exercises — single-step self-rated
    if (q.type === TYPES.TYPE_MEANING || q.type === TYPES.TYPE_WORD) {
      setResults((prev) => [...prev, makeResult(q, correct, false, null)]);
      updateWeakTagRef.current(q.noteId, "typing", correct);
      const shouldRequeue = !correct && (q._requeues ?? 0) < MAX_REQUEUES;
      if (shouldRequeue) setQuestions((prev) => requeueQuestion(prev, current));
      setRevealed(false);
      const next = current + 1;
      const isLast = next >= questions.length;
      if (isLast && !shouldRequeue) setPhase("finished");
      else setCurrent(next);
      return;
    }

    if (drillStep === 1) {
      // Step 1: pronunciation check
      setResults((prev) => [...prev, makeResult(q, correct, false, null)]);
      updateWeakTagRef.current(q.noteId, "pronunciation", correct);
      drillStep1CorrectRef.current = correct;

      if (!correct && (q._requeues ?? 0) < MAX_REQUEUES) {
        setQuestions((prev) => requeueQuestion(prev, current));
      }
      setRevealed(false);
      setDrillStep(2);
      return;
    }

    // Step 2: meaning check
    setResults((prev) => [...prev, makeResult(q, correct, false, null)]);
    updateWeakTagRef.current(q.noteId, "meaning", correct);

    // Re-queue for step 2 failure only if step 1 passed (step 1 failure already re-queued)
    const shouldRequeue = !correct && drillStep1CorrectRef.current && (q._requeues ?? 0) < MAX_REQUEUES;
    if (shouldRequeue) {
      setQuestions((prev) => requeueQuestion(prev, current));
    }

    setDrillStep(1);
    setRevealed(false);
    const next   = current + 1;
    const isLast = next >= questions.length;
    if (isLast && !shouldRequeue) {
      setPhase("finished");
    } else {
      setCurrent(next);
    }
  }, [questions, current, drillStep]);

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
    if (next >= questions.length) {
      setPhase("finished");
    } else {
      setCurrent(next);
      setSelected(null);
    }
  }, [current, questions.length]);

  const confusionReport = useMemo(() => {
    if (phase !== "finished") return null;

    // Collapse multi-step pairs: two step-results per card → one combined result.
    // A card is correct only if BOTH steps were correct. Uses (noteId + _requeues)
    // as the instance key so re-queued copies are counted separately.
    const msGroups = {}; // key → merged result
    const deduped  = [];
    for (const r of results) {
      if (r.type === TYPES.MULTISTEP) {
        const key = `${r.noteId}_${r._requeues}`;
        if (!msGroups[key]) { msGroups[key] = { ...r }; deduped.push(msGroups[key]); }
        else if (!r.correct) msGroups[key].correct = false;
      } else {
        deduped.push(r);
      }
    }

    const wrongByNote = {};
    deduped.forEach((r) => {
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
    const score = deduped.filter((r) => r.correct).length;
    return { score, total: deduped.length, confusedWords };
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
    drillStep,
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
