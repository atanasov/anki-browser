/**
 * usePracticeSession
 * Manages the full lifecycle of a practice session:
 * question building, answer tracking, and confusion report.
 */

import { useState, useCallback, useMemo } from "react";
import { extractFieldValue } from "../utils/fieldHelpers";

// ─── Exercise types ────────────────────────────────────────────────────────
export const TYPES = {
  WORD_MEANING: "word-meaning",
  MEANING_WORD: "meaning-word",
  WORD_PINYIN:  "word-pinyin",
  PINYIN_WORD:  "pinyin-word",
};

export const EXERCISE_LABELS = {
  [TYPES.WORD_MEANING]: "Word → Meaning",
  [TYPES.MEANING_WORD]: "Meaning → Word",
  [TYPES.WORD_PINYIN]:  "Word → Pinyin",
  [TYPES.PINYIN_WORD]:  "Pinyin → Word",
  mixed:                "Mixed",
};

export const PROMPT_LABELS = {
  [TYPES.WORD_MEANING]: "What does this mean?",
  [TYPES.MEANING_WORD]: "Which word matches?",
  [TYPES.WORD_PINYIN]:  "What is the pinyin?",
  [TYPES.PINYIN_WORD]:  "Which word is this?",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const clean = (field) =>
  extractFieldValue(field).replace(/<[^>]*>/g, "").trim();

/** Returns the available exercise types for a given view config */
export const getAvailableTypes = (view) => {
  const sw = view?.similarWords || {};
  const types = [];
  if (sw.wordField && sw.translationField) {
    types.push(TYPES.WORD_MEANING, TYPES.MEANING_WORD);
  }
  if (sw.wordField && sw.pinyinField) {
    types.push(TYPES.WORD_PINYIN, TYPES.PINYIN_WORD);
  }
  return types;
};

// ─── Question builder ──────────────────────────────────────────────────────
const buildQuestion = (note, pool, type, view) => {
  const sw = view?.similarWords || {};

  const word    = clean(note.fields?.[sw.wordField]);
  const pinyin  = clean(note.fields?.[sw.pinyinField]);
  const meaning = clean(note.fields?.[sw.translationField]);

  let prompt, answer, getDistractor;

  switch (type) {
    case TYPES.WORD_MEANING:
      if (!word || !meaning) return null;
      prompt = word;
      answer = meaning;
      getDistractor = (n) => clean(n.fields?.[sw.translationField]);
      break;
    case TYPES.MEANING_WORD:
      if (!meaning || !word) return null;
      prompt = meaning;
      answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    case TYPES.WORD_PINYIN:
      if (!word || !pinyin) return null;
      prompt = word;
      answer = pinyin;
      getDistractor = (n) => clean(n.fields?.[sw.pinyinField]);
      break;
    case TYPES.PINYIN_WORD:
      if (!pinyin || !word) return null;
      prompt = pinyin;
      answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    default:
      return null;
  }

  // ── Distractor selection ─────────────────────────────────────────────
  // Priority: (1) shares a character with current word + similar answer length
  //           (2) shares a character, any length
  //           (3) similar answer length, no character overlap
  //           (4) anything remaining
  // This ensures wrong options look genuinely similar, not random.

  const NUM_DISTRACTORS = 5; // total options = 6
  const currentChars = new Set([...word]); // word already cleaned above
  const answerLen    = answer.length;

  const shuffledPool = shuffle(pool.filter((n) => n.noteId !== note.noteId));

  // Score each candidate: does its word share any character with the current word?
  const candidates = shuffledPool
    .map((n) => {
      const d       = getDistractor(n);
      const nWord   = clean(n.fields?.[sw.wordField]);
      const overlap = [...nWord].filter((c) => currentChars.has(c)).length;
      return { d, overlap };
    })
    .filter(({ d }) => d && d !== answer)
    .filter(({ d }, i, arr) => arr.findIndex((x) => x.d === d) === i); // unique answers

  const withChar    = candidates.filter(({ overlap }) => overlap > 0).map(({ d }) => d);
  const noChar      = candidates.filter(({ overlap }) => overlap === 0).map(({ d }) => d);

  const withCharNear = withChar.filter((d) => Math.abs(d.length - answerLen) <= 1);
  const noCharNear   = noChar.filter((d) => Math.abs(d.length - answerLen) <= 1);

  // Fill bucket: prefer withCharNear → withChar → noCharNear → noChar
  const picked = [];
  const add = (list) => {
    for (const d of list) {
      if (picked.length >= NUM_DISTRACTORS) break;
      if (!picked.includes(d)) picked.push(d);
    }
  };
  add(withCharNear);
  add(withChar);
  add(noCharNear);
  add(noChar);

  while (picked.length < NUM_DISTRACTORS) picked.push("—");
  const distractors = picked.slice(0, NUM_DISTRACTORS);

  const options = shuffle([answer, ...distractors]);

  return {
    noteId: note.noteId,
    type,
    prompt,
    promptLabel: PROMPT_LABELS[type],
    answer,
    options,
    correctIndex: options.indexOf(answer),
  };
};

// ─── Hook ──────────────────────────────────────────────────────────────────
export const usePracticeSession = () => {
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [selected,  setSelected]  = useState(null); // chosen option index
  const [results,   setResults]   = useState([]);
  const [phase,     setPhase]     = useState("idle"); // idle|playing|finished

  /** Build questions from a flat note pool and start the session */
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
    setSelected(null);
    setResults([]);
    setPhase("playing");
  }, []);

  /** Record the user's answer and auto-advance after 1.2 s */
  const answer = useCallback(
    (optionIndex) => {
      if (selected !== null) return;
      setSelected(optionIndex);

      const q = questions[current];
      const correct = optionIndex === q.correctIndex;

      setResults((prev) => [
        ...prev,
        {
          noteId: q.noteId,
          prompt: q.prompt,
          answer: q.answer,
          correct,
          picked: q.options[optionIndex], // what the user actually chose
        },
      ]);

      setTimeout(() => {
        if (current + 1 >= questions.length) {
          setPhase("finished");
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
        }
      }, 1200);
    },
    [selected, questions, current]
  );

  /** Computed confusion report — available when phase === "finished" */
  const confusionReport = useMemo(() => {
    if (phase !== "finished") return null;

    const wrongByNote = {};
    results.forEach((r) => {
      if (!r.correct) {
        if (!wrongByNote[r.noteId]) {
          wrongByNote[r.noteId] = { prompt: r.prompt, answer: r.answer, errors: 0, wrongPicks: [] };
        }
        wrongByNote[r.noteId].errors++;
        // Collect unique wrong picks for this word
        if (r.picked && !wrongByNote[r.noteId].wrongPicks.includes(r.picked)) {
          wrongByNote[r.noteId].wrongPicks.push(r.picked);
        }
      }
    });

    const confusedWords = Object.values(wrongByNote).sort(
      (a, b) => b.errors - a.errors
    );

    // Count how many confused words each Hanzi character appears in
    const charCount = {};
    confusedWords.forEach(({ prompt }) => {
      [...new Set([...prompt])].forEach((ch) => {
        if (/\p{Script=Han}/u.test(ch)) {
          charCount[ch] = (charCount[ch] || 0) + 1;
        }
      });
    });

    const confusedChars = Object.entries(charCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([char, count]) => ({ char, count }));

    return {
      score:        results.filter((r) => r.correct).length,
      total:        results.length,
      confusedWords,
      confusedChars,
    };
  }, [phase, results]);

  const score = results.filter((r) => r.correct).length;

  return {
    phase,
    current,
    selected,
    confusionReport,
    start,
    answer,
    currentQuestion: questions[current] ?? null,
    progress: { current: current + 1, total: questions.length },
    score,
    errors: results.length - score,
  };
};
