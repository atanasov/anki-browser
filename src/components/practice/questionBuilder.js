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
  MULTISTEP:          "multistep",
  TYPE_MEANING:       "type-meaning",  // show word, type the translation
  TYPE_WORD:          "type-word",     // show translation, type the word
};

export const TYPE_TO_TAG_CATEGORY = {
  [TYPES.WORD_MEANING]:       "meaning",
  [TYPES.MEANING_WORD]:       "meaning",
  [TYPES.WORD_PRONUNCIATION]: "pronunciation",
  [TYPES.PRONUNCIATION_WORD]: "pronunciation",
  [TYPES.SENTENCE_CLOZE]:     "recognition",
  [TYPES.MULTISTEP]:          null, // per-step category handled in selfRate
  [TYPES.TYPE_MEANING]:       "typing",
  [TYPES.TYPE_WORD]:          "typing",
};

export const EXERCISE_LABELS = {
  [TYPES.WORD_MEANING]:       "Word → Meaning",
  [TYPES.MEANING_WORD]:       "Meaning → Word",
  [TYPES.WORD_PRONUNCIATION]: "Word → Pronunciation",
  [TYPES.PRONUNCIATION_WORD]: "Pronunciation → Word",
  [TYPES.SENTENCE_CLOZE]:     "Sentence → Word",
  [TYPES.MULTISTEP]:          "Multi-step Drill",
  [TYPES.TYPE_MEANING]:       "Word → Translation (type)",
  [TYPES.TYPE_WORD]:          "Translation → Word (type)",
  mixed:                      "Mixed",
};

export const PROMPT_LABELS = {
  [TYPES.WORD_MEANING]:       "What does this mean?",
  [TYPES.MEANING_WORD]:       "Which word matches?",
  [TYPES.WORD_PRONUNCIATION]: "What is the pronunciation?",
  [TYPES.PRONUNCIATION_WORD]: "Which word is this?",
  [TYPES.SENTENCE_CLOZE]:     "Fill in the blank",
  [TYPES.MULTISTEP]:          "What's the pronunciation?",
  [TYPES.TYPE_MEANING]:       "Type the translation",
  [TYPES.TYPE_WORD]:          "Type the word",
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
    types.push(TYPES.MULTISTEP);
  }
  if (sw.wordField && sw.translationField) {
    types.push(TYPES.TYPE_MEANING, TYPES.TYPE_WORD);
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

  if (type === TYPES.MULTISTEP) {
    if (!word || !pronunciation || !meaning) return null;
    return {
      noteId: note.noteId, type: TYPES.MULTISTEP,
      prompt: word, promptLabel: PROMPT_LABELS[TYPES.MULTISTEP],
      answer: pronunciation, options: [], correctIndex: -1,
      word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
      tags: note.tags || [], cardIds: note.cards || [],
    };
  }

  if (type === TYPES.TYPE_MEANING) {
    if (!word || !meaning) return null;
    return {
      noteId: note.noteId, type: TYPES.TYPE_MEANING,
      prompt: word, promptLabel: PROMPT_LABELS[TYPES.TYPE_MEANING],
      answer: meaning, options: [], correctIndex: -1,
      word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
      tags: note.tags || [], cardIds: note.cards || [],
    };
  }

  if (type === TYPES.TYPE_WORD) {
    if (!meaning || !word) return null;
    return {
      noteId: note.noteId, type: TYPES.TYPE_WORD,
      prompt: meaning, promptLabel: PROMPT_LABELS[TYPES.TYPE_WORD],
      answer: word, options: [], correctIndex: -1,
      word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
      tags: note.tags || [], cardIds: note.cards || [],
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
      prompt = sentence.split(word).join("[___]"); answer = word;
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
        noteId: n.noteId,
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
  const answerOption = { text: answer, word, pronunciation, meaning, noteId: note.noteId, sentences, sentenceTranslation };
  const options      = shuffle([answerOption, ...distractors]);

  return {
    noteId: note.noteId, type, prompt, promptLabel: PROMPT_LABELS[type],
    answer, options, correctIndex: options.findIndex((o) => o.text === answer),
    word, pronunciation, meaning, sentence, audioRaw, sentences, sentenceTranslation,
    tags: note.tags || [], cardIds: note.cards || [],
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
