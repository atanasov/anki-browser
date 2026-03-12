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
  RECALL:             "recall",
};

export const EXERCISE_LABELS = {
  [TYPES.WORD_MEANING]:       "Word → Meaning",
  [TYPES.MEANING_WORD]:       "Meaning → Word",
  [TYPES.WORD_PRONUNCIATION]: "Word → Pronunciation",
  [TYPES.PRONUNCIATION_WORD]: "Pronunciation → Word",
  [TYPES.SENTENCE_CLOZE]:     "Sentence → Word",
  [TYPES.RECALL]:             "Recall (self-assess)",
  mixed:                      "Mixed",
};

export const PROMPT_LABELS = {
  [TYPES.WORD_MEANING]:       "What does this mean?",
  [TYPES.MEANING_WORD]:       "Which word matches?",
  [TYPES.WORD_PRONUNCIATION]: "What is the pronunciation?",
  [TYPES.PRONUNCIATION_WORD]: "Which word is this?",
  [TYPES.SENTENCE_CLOZE]:     "Fill in the blank",
  [TYPES.RECALL]:             "Say aloud: pronunciation · meaning · example",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const clean = (field) =>
  extractFieldValue(field).replace(/<[^>]*>/g, "").trim();

/** Split a multi-sentence field (separated by <br>) into an array of up to 3 shortest sentences */
const parseSentences = (raw) => {
  if (!raw) return [];
  return raw
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)
    .slice(0, 5);
};

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
  if (sw.wordField && sw.pronunciationField && sw.translationField) {
    types.push(TYPES.RECALL);
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
  // Raw audio field value — keeps [sound:filename.mp3] format for playback
  const audioRaw = sw.audioField ? extractFieldValue(note.fields?.[sw.audioField]) : "";
  const sentenceTranslation = sw.sentenceTranslationField ? clean(note.fields?.[sw.sentenceTranslationField]) : "";
  const sentences = parseSentences(extractFieldValue(note.fields?.[sentenceFieldName] ?? ""));

  // ── Recall: no options needed, just the word as prompt ──────────────
  if (type === TYPES.RECALL) {
    if (!word || (!pronunciation && !meaning)) return null;
    return {
      noteId: note.noteId,
      type: TYPES.RECALL,
      prompt: word,
      promptLabel: PROMPT_LABELS[TYPES.RECALL],
      answer: pronunciation,
      options: [],
      correctIndex: -1,
      word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
    };
  }

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
      if (!sentence.includes(word)) return null;
      prompt = sentence.replace(word, "[___]");
      answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    default:
      return null;
  }

  // ── Distractor selection ─────────────────────────────────────────────
  const NUM_DISTRACTORS = 5;
  const currentChars = new Set([...word]);
  const answerLen    = answer.length;

  const shuffledPool = shuffle(pool.filter((n) => n.noteId !== note.noteId));

  const candidates = shuffledPool
    .map((n) => {
      const text     = getDistractor(n);
      const nWord    = clean(n.fields?.[sw.wordField]);
      const nPronunciation  = clean(n.fields?.[sw.pronunciationField]);
      const nMeaning = clean(n.fields?.[sw.translationField]);
      const overlap  = [...nWord].filter((c) => currentChars.has(c)).length;
      const nSentenceRaw = sentenceFieldName ? extractFieldValue(n.fields?.[sentenceFieldName] ?? "") : "";
      const nSentenceTranslation = sw.sentenceTranslationField ? clean(n.fields?.[sw.sentenceTranslationField]) : "";
      return { text, word: nWord, pronunciation: nPronunciation, meaning: nMeaning, overlap, sentences: parseSentences(nSentenceRaw), sentenceTranslation: nSentenceTranslation };
    })
    .filter(({ text }) => text && text !== answer)
    .filter(({ text }, i, arr) => arr.findIndex((x) => x.text === text) === i);

  const withChar    = candidates.filter(({ overlap }) => overlap > 0);
  const noChar      = candidates.filter(({ overlap }) => overlap === 0);
  const withCharNear = withChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);
  const noCharNear   = noChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);

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
    picked.push({ text: "—", word: "", pronunciation: "", meaning: "", sentences: [], sentenceTranslation: "" });
  }
  const distractors = picked.slice(0, NUM_DISTRACTORS);

  const answerOption = { text: answer, word, pronunciation, meaning, sentences, sentenceTranslation };
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
    audioRaw,
    sentences,
    sentenceTranslation,
  };
};

// ─── Hook ──────────────────────────────────────────────────────────────────
export const usePracticeSession = () => {
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [revealed,  setRevealed]  = useState(false); // recall mode: card flipped?
  const [results,   setResults]   = useState([]);
  const [phase,     setPhase]     = useState("idle");

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
    setRevealed(false);
    setResults([]);
    setPhase("playing");
  }, []);

  /** Flip the recall card to show the answer */
  const reveal = useCallback(() => {
    setRevealed(true);
  }, []);

  /** Self-rate a recall card: true = know it, false = not yet */
  const selfRate = useCallback((correct) => {
    const q = questions[current];
    setResults((prev) => [
      ...prev,
      {
        noteId:        q.noteId,
        prompt:        q.prompt,
        answer:        q.answer,
        word:          q.word,
        pronunciation: q.pronunciation,
        meaning:       q.meaning,
        sentences:              q.sentences ?? [],
        sentenceTranslation:    q.sentenceTranslation ?? "",
        correct,
        picked:        correct ? q.pronunciation : "(not yet)",
        pickedWord: "", pickedPronunciation: "", pickedMeaning: "",
        pickedSentences: [], pickedSentenceTranslation: "",
      },
    ]);

    if (!correct) {
      setQuestions((prev) => {
        const insertAt = Math.min(current + 4, prev.length);
        const arr = [...prev];
        arr.splice(insertAt, 0, prev[current]);
        return arr;
      });
    }

    // Advance immediately — the rating IS the action for recall
    const isLast = current + 1 >= questions.length;
    if (isLast && correct) {
      setPhase("finished");
    } else {
      setCurrent((c) => c + 1);
      setRevealed(false);
    }
  }, [questions, current]);

  /** Record a multiple-choice answer. Wrong answers are re-queued ~4 cards later. */
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
          word:                     q.word,
          pronunciation:            q.pronunciation,
          meaning:                  q.meaning,
          sentences:                q.sentences ?? [],
          sentenceTranslation:      q.sentenceTranslation ?? "",
          correct,
          picked:                   pickedOpt.text,
          pickedWord:               pickedOpt.word,
          pickedPronunciation:      pickedOpt.pronunciation,
          pickedMeaning:            pickedOpt.meaning,
          pickedSentences:          pickedOpt.sentences ?? [],
          pickedSentenceTranslation: pickedOpt.sentenceTranslation ?? "",
        },
      ]);

      if (!correct) {
        setQuestions((prev) => {
          const insertAt = Math.min(current + 4, prev.length);
          const next = [...prev];
          next.splice(insertAt, 0, prev[current]);
          return next;
        });
      }
    },
    [selected, questions, current]
  );

  /** Advance past a multiple-choice question after reviewing the answer. */
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
            noteId:              r.noteId,
            prompt:              r.prompt,
            answer:              r.answer,
            word:                r.word,
            pronunciation:       r.pronunciation,
            meaning:             r.meaning,
            sentences:           r.sentences ?? [],
            sentenceTranslation: r.sentenceTranslation ?? "",
            errors:              0,
            wrongPicks: [],
          };
        }
        wrongByNote[r.noteId].errors++;
        if (r.picked && !wrongByNote[r.noteId].wrongPicks.some((p) => p.text === r.picked)) {
          wrongByNote[r.noteId].wrongPicks.push({
            text:                r.picked,
            word:                r.pickedWord,
            pronunciation:       r.pickedPronunciation,
            meaning:             r.pickedMeaning,
            sentences:           r.pickedSentences ?? [],
            sentenceTranslation: r.pickedSentenceTranslation ?? "",
          });
        }
      }
    });

    const confusedWords = Object.values(wrongByNote).sort((a, b) => b.errors - a.errors);

    // Count how many times each character appears across all confused *words* (not prompts).
    // Using `errors` as weight so frequently missed words contribute more.
    const charCount = {};
    confusedWords.forEach(({ word, errors }) => {
      [...new Set([...word])].forEach((ch) => {
        if (/\p{Script=Han}/u.test(ch)) {
          charCount[ch] = (charCount[ch] || 0) + errors;
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
    revealed,
    confusionReport,
    start,
    answer,
    advance,
    reveal,
    selfRate,
    currentQuestion: questions[current] ?? null,
    progress: { current: current + 1, total: questions.length },
    score,
    errors: results.length - score,
  };
};
