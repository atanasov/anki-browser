/**
 * usePracticeSession
 * Manages the full lifecycle of a practice session:
 * question building, answer tracking, and confusion report.
 */

import { useState, useCallback, useMemo } from "react";
import { extractFieldValue } from "../utils/fieldHelpers";

// ─── Exercise types ────────────────────────────────────────────────────────
export const TYPES = {
  WORD_MEANING:       "word-meaning",
  MEANING_WORD:       "meaning-word",
  WORD_PRONUNCIATION: "word-pronunciation",
  PRONUNCIATION_WORD: "pronunciation-word",
  SENTENCE_CLOZE:     "sentence-cloze",
};

export const EXERCISE_LABELS = {
  [TYPES.WORD_MEANING]:       "Word → Meaning",
  [TYPES.MEANING_WORD]:       "Meaning → Word",
  [TYPES.WORD_PRONUNCIATION]: "Word → Pronunciation",
  [TYPES.PRONUNCIATION_WORD]: "Pronunciation → Word",
  [TYPES.SENTENCE_CLOZE]:     "Sentence → Word",
  mixed:                      "Mixed",
};

export const PROMPT_LABELS = {
  [TYPES.WORD_MEANING]:       "What does this mean?",
  [TYPES.MEANING_WORD]:       "Which word matches?",
  [TYPES.WORD_PRONUNCIATION]: "What is the pronunciation?",
  [TYPES.PRONUNCIATION_WORD]: "Which word is this?",
  [TYPES.SENTENCE_CLOZE]:     "Fill in the blank",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const clean = (field) =>
  extractFieldValue(field).replace(/<[^>]*>/g, "").trim();

/** Returns the available exercise types for a given view config */
export const getAvailableTypes = (view) => {
  const sw = view?.similarWords || {};
  const sentenceField = sw.sentenceField || view?.examples?.sentenceField || "";
  const types = [];
  if (sw.wordField && sw.translationField) {
    types.push(TYPES.WORD_MEANING, TYPES.MEANING_WORD);
  }
  if (sw.wordField && sw.pronunciationField) {
    types.push(TYPES.WORD_PRONUNCIATION, TYPES.PRONUNCIATION_WORD);
  }
  if (sw.wordField && sentenceField) {
    types.push(TYPES.SENTENCE_CLOZE);
  }
  return types;
};

// ─── Question builder ──────────────────────────────────────────────────────
const buildQuestion = (note, pool, type, view) => {
  const sw = view?.similarWords || {};

  const word         = clean(note.fields?.[sw.wordField]);
  const pronunciation = clean(note.fields?.[sw.pronunciationField]);
  const meaning      = clean(note.fields?.[sw.translationField]);
  const sentenceFieldName = sw.sentenceField || view?.examples?.sentenceField || "";
  const sentence = sentenceFieldName ? clean(note.fields?.[sentenceFieldName]) : "";

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
    case TYPES.WORD_PRONUNCIATION:
      if (!word || !pronunciation) return null;
      prompt = word;
      answer = pronunciation;
      getDistractor = (n) => clean(n.fields?.[sw.pronunciationField]);
      break;
    case TYPES.PRONUNCIATION_WORD:
      if (!pronunciation || !word) return null;
      prompt = pronunciation;
      answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    case TYPES.SENTENCE_CLOZE:
      if (!sentence || !word) return null;
      // Replace the word with a gap marker; fall back if word not found in sentence
      if (!sentence.includes(word)) return null;
      prompt = sentence.replace(word, "[___]");
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
      const text     = getDistractor(n);
      const nWord    = clean(n.fields?.[sw.wordField]);
      const nPronunciation  = clean(n.fields?.[sw.pronunciationField]);
      const nMeaning = clean(n.fields?.[sw.translationField]);
      const overlap  = [...nWord].filter((c) => currentChars.has(c)).length;
      return { text, word: nWord, pronunciation: nPronunciation, meaning: nMeaning, overlap };
    })
    .filter(({ text }) => text && text !== answer)
    .filter(({ text }, i, arr) => arr.findIndex((x) => x.text === text) === i); // unique

  const withChar    = candidates.filter(({ overlap }) => overlap > 0);
  const noChar      = candidates.filter(({ overlap }) => overlap === 0);

  const withCharNear = withChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);
  const noCharNear   = noChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);

  // Fill bucket: prefer withCharNear → withChar → noCharNear → noChar
  const picked = [];
  const add = (list) => {
    for (const item of list) {
      if (picked.length >= NUM_DISTRACTORS) break;
      if (!picked.some((p) => p.text === item.text)) picked.push(item);
    }
  };
  add(withCharNear);
  add(withChar);
  add(noCharNear);
  add(noChar);

  while (picked.length < NUM_DISTRACTORS) {
    picked.push({ text: "—", word: "", pronunciation: "", meaning: "" });
  }
  const distractors = picked.slice(0, NUM_DISTRACTORS);

  // Each option carries full context so wrong picks can show pronunciation/meaning
  const answerOption = { text: answer, word, pronunciation, meaning };
  const options = shuffle([answerOption, ...distractors]);

  return {
    noteId: note.noteId,
    type,
    prompt,
    promptLabel: PROMPT_LABELS[type],
    answer,
    options,
    correctIndex: options.findIndex((o) => o.text === answer),
    word,
    pronunciation,
    meaning,
    sentence,
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

      const pickedOpt = q.options[optionIndex];
      setResults((prev) => [
        ...prev,
        {
          noteId:        q.noteId,
          prompt:        q.prompt,
          answer:        q.answer,
          word:                q.word,
          pronunciation:       q.pronunciation,
          meaning:             q.meaning,
          correct,
          picked:              pickedOpt.text,
          pickedWord:          pickedOpt.word,
          pickedPronunciation: pickedOpt.pronunciation,
          pickedMeaning:       pickedOpt.meaning,
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
          wrongByNote[r.noteId] = {
            noteId:  r.noteId,
            prompt:  r.prompt,
            answer:  r.answer,
            word:          r.word,
            pronunciation: r.pronunciation,
            meaning:       r.meaning,
            errors:        0,
            wrongPicks: [],
          };
        }
        wrongByNote[r.noteId].errors++;
        // Collect unique wrong picks for this word (with full context)
        if (r.picked && !wrongByNote[r.noteId].wrongPicks.some((p) => p.text === r.picked)) {
          wrongByNote[r.noteId].wrongPicks.push({
            text:          r.picked,
            word:          r.pickedWord,
            pronunciation: r.pickedPronunciation,
            meaning:       r.pickedMeaning,
          });
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
