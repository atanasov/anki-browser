/**
 * usePracticeSession
 * Manages the lifecycle of a practice session: phase, current question,
 * answer recording, and the end-of-session confusion report.
 *
 * Question building lives in questionBuilder.js (pure functions).
 */

import { useState, useCallback, useMemo } from "react";
import { shuffle } from "../components/practice/practiceUtils";
import {
  TYPES,
  getAvailableTypes,
  buildQuestion,
} from "../components/practice/questionBuilder";

// Re-export so existing import sites don't need to change
export { TYPES, EXERCISE_LABELS, PROMPT_LABELS, getAvailableTypes } from "../components/practice/questionBuilder";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Max times a wrong answer is re-queued — prevents truly infinite sessions */
const MAX_REQUEUES = 2;

// ─── Helpers ───────────────────────────────────────────────────────────────

const makeResult = (q, correct, gaveUp, pickedOpt) => ({
  noteId:                   q.noteId,
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

export const usePracticeSession = () => {
  const [questions,    setQuestions]    = useState([]);
  const [current,      setCurrent]      = useState(0);
  const [initialTotal, setInitialTotal] = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [revealed,     setRevealed]     = useState(false);
  const [results,      setResults]      = useState([]);
  const [phase,        setPhase]        = useState("idle");

  const start = useCallback((notes, exerciseType, view) => {
    const available = getAvailableTypes(view);
    if (available.length === 0) return;

    const types = exerciseType === "mixed" ? available : [exerciseType];
    const qs = shuffle(
      notes.flatMap((note) =>
        types.map((type) => buildQuestion(note, notes, type, view))
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
  }, []);

  /** Flip the recall card to show the answer */
  const reveal = useCallback(() => setRevealed(true), []);

  /** Self-rate a recall card: true = know it, false = not yet */
  const selfRate = useCallback((correct) => {
    const q = questions[current];
    setResults((prev) => [...prev, makeResult(q, correct, false, null)]);

    const canRequeue = !correct && (q._requeues ?? 0) < MAX_REQUEUES;
    if (canRequeue) {
      setQuestions((prev) => requeueQuestion(prev, current));
    }

    const next   = current + 1;
    const isLast = next >= questions.length;
    if (isLast && (correct || !canRequeue)) {
      setPhase("finished");
    } else {
      setCurrent(next);
      setRevealed(false);
    }
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

    if (!correct) {
      setQuestions((prev) => requeueQuestion(prev, current));
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
        // Only record a wrong pick if there's a real word to show (excludes recall "not yet")
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

  const score = results.filter((r) => r.correct).length;

  return {
    phase,
    current,
    selected,
    revealed,
    confusionReport,
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
