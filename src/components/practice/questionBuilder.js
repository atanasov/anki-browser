/**
 * questionBuilder
 * Pure functions: exercise type constants, question building, drill pairs.
 * No React — safe to import anywhere.
 */

import { extractFieldValue } from "../../utils/fieldHelpers";
import { shuffle } from "./practiceUtils";

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

const clean = (field) =>
  extractFieldValue(field).replace(/<[^>]*>/g, "").trim();

const parseSentences = (raw) => {
  if (!raw) return [];
  return raw
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)
    .slice(0, 5);
};

// ─── Available types ────────────────────────────────────────────────────────

/** Returns the exercise types available for a given view config */
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

export const buildQuestion = (note, pool, type, view) => {
  const sw = view?.similarWords || {};

  const word          = clean(note.fields?.[sw.wordField]);
  const pronunciation = clean(note.fields?.[sw.pronunciationField]);
  const meaning       = clean(note.fields?.[sw.translationField]);
  const sentenceFieldName = sw.sentenceField || view?.examples?.sentenceField || "";
  const sentence      = sentenceFieldName ? clean(note.fields?.[sentenceFieldName]) : "";
  const audioRaw      = sw.audioField ? extractFieldValue(note.fields?.[sw.audioField]) : "";
  const sentenceTranslation = sw.sentenceTranslationField
    ? clean(note.fields?.[sw.sentenceTranslationField]) : "";
  const sentences = parseSentences(extractFieldValue(note.fields?.[sentenceFieldName] ?? ""));

  if (type === TYPES.RECALL) {
    if (!word || (!pronunciation && !meaning)) return null;
    return {
      noteId: note.noteId, type: TYPES.RECALL,
      prompt: word, promptLabel: PROMPT_LABELS[TYPES.RECALL],
      answer: pronunciation, options: [], correctIndex: -1,
      word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
    };
  }

  let prompt, answer, getDistractor;

  switch (type) {
    case TYPES.WORD_MEANING:
      if (!word || !meaning) return null;
      prompt = word; answer = meaning;
      getDistractor = (n) => clean(n.fields?.[sw.translationField]);
      break;
    case TYPES.MEANING_WORD:
      if (!meaning || !word) return null;
      prompt = meaning; answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    case TYPES.WORD_PRONUNCIATION:
      if (!word || !pronunciation) return null;
      prompt = word; answer = pronunciation;
      getDistractor = (n) => clean(n.fields?.[sw.pronunciationField]);
      break;
    case TYPES.PRONUNCIATION_WORD:
      if (!pronunciation || !word) return null;
      prompt = pronunciation; answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    case TYPES.SENTENCE_CLOZE:
      if (!sentence || !word || !sentence.includes(word)) return null;
      prompt = sentence.replace(word, "[___]"); answer = word;
      getDistractor = (n) => clean(n.fields?.[sw.wordField]);
      break;
    default:
      return null;
  }

  const NUM_DISTRACTORS = 5;
  const currentChars = new Set([...word]);
  const answerLen    = answer.length;
  const shuffledPool = shuffle(pool.filter((n) => n.noteId !== note.noteId));

  const candidates = shuffledPool
    .map((n) => {
      const text        = getDistractor(n);
      const nWord       = clean(n.fields?.[sw.wordField]);
      const nPron       = clean(n.fields?.[sw.pronunciationField]);
      const nMeaning    = clean(n.fields?.[sw.translationField]);
      const overlap     = [...nWord].filter((c) => currentChars.has(c)).length;
      const nSentRaw    = sentenceFieldName ? extractFieldValue(n.fields?.[sentenceFieldName] ?? "") : "";
      const nSentTrans  = sw.sentenceTranslationField
        ? clean(n.fields?.[sw.sentenceTranslationField]) : "";
      return {
        text, word: nWord, pronunciation: nPron, meaning: nMeaning,
        overlap, sentences: parseSentences(nSentRaw), sentenceTranslation: nSentTrans,
      };
    })
    .filter(({ text }) => text && text !== answer)
    .filter(({ text }, i, arr) => arr.findIndex((x) => x.text === text) === i);

  const withChar     = candidates.filter(({ overlap }) => overlap > 0);
  const noChar       = candidates.filter(({ overlap }) => overlap === 0);
  const withCharNear = withChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);
  const noCharNear   = noChar.filter(({ text }) => Math.abs(text.length - answerLen) <= 1);

  const picked = [];
  const add = (list) => {
    for (const item of list) {
      if (picked.length >= NUM_DISTRACTORS) break;
      if (!picked.some((p) => p.text === item.text)) picked.push(item);
    }
  };
  add(withCharNear); add(withChar); add(noCharNear); add(noChar);

  while (picked.length < NUM_DISTRACTORS) {
    picked.push({ text: "—", word: "", pronunciation: "", meaning: "", sentences: [], sentenceTranslation: "" });
  }

  const distractors  = picked.slice(0, NUM_DISTRACTORS);
  const answerOption = { text: answer, word, pronunciation, meaning, sentences, sentenceTranslation };
  const options      = shuffle([answerOption, ...distractors]);

  return {
    noteId: note.noteId, type, prompt, promptLabel: PROMPT_LABELS[type],
    answer, options, correctIndex: options.findIndex((o) => o.text === answer),
    word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
  };
};

// ─── Drill pairs ───────────────────────────────────────────────────────────

/** Convert a confusionReport into { target, foil } pairs (deduped) */
export const buildDrillPairs = (report) => {
  if (!report) return [];
  const seen  = new Set();
  const pairs = [];
  for (const cw of report.confusedWords) {
    for (const pick of cw.wrongPicks) {
      if (!pick.word) continue;
      const key = `${cw.word}|${pick.word}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({
        target: { word: cw.word, pronunciation: cw.pronunciation, meaning: cw.meaning, sentences: cw.sentences ?? [], sentenceTranslation: cw.sentenceTranslation ?? "" },
        foil:   { word: pick.word, pronunciation: pick.pronunciation, meaning: pick.meaning, sentences: pick.sentences ?? [], sentenceTranslation: pick.sentenceTranslation ?? "" },
      });
    }
  }
  return pairs;
};
