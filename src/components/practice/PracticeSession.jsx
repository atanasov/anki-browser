/**
 * PracticeSession
 * Full-screen overlay — active session + end-screen confusion report.
 */

import { useEffect, useCallback, useState } from "react";
import { usePracticeSession, TYPES } from "../../hooks/usePracticeSession";
import useStore from "../../store";
import ankiConnect from "../../services/ankiConnect";
import mediaCacheService from "../../services/mediaCache";

// Step down from the configured max size based on text length.
// Chinese chars are square (wide), Latin chars are narrower — but length is still
// the best single proxy without DOM measurement.
const FONT_SIZES = ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];

// Map practiceFontSize setting to a maxIndex for adaptiveFont
const PRACTICE_SIZE_TO_MAX_INDEX = {
  small:   1,
  medium:  2,
  large:   3,
  xlarge:  4,
  xxlarge: 5,
};

const adaptiveFont = (text, maxIndex = 4) => {
  const len = (text || "").length;
  const step = len > 45 ? 4 : len > 28 ? 3 : len > 15 ? 2 : len > 8 ? 1 : 0;
  return FONT_SIZES[Math.max(0, maxIndex - step)];
};

// Sentence with the target word highlighted in orange (used as context on word-prompt types).
const SentenceWithHighlight = ({ sentence, word }) => {
  if (!word || !sentence.includes(word)) return <>{sentence}</>;
  const idx = sentence.indexOf(word);
  return (
    <>
      {sentence.slice(0, idx)}
      <span className="font-semibold text-orange-500 dark:text-orange-400">{word}</span>
      {sentence.slice(idx + word.length)}
    </>
  );
};

// Sentence cloze prompt: renders the gap as a bold styled placeholder.
const ClozePrompt = ({ prompt }) => {
  const parts = prompt.split("[___]");
  if (parts.length < 2) return <>{prompt}</>;
  return (
    <>
      {parts[0]}
      <span className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold tracking-widest border-b-2 border-orange-400">
        ？？？
      </span>
      {parts[1]}
    </>
  );
};

// Collapsible translation hint — hidden by default so it doesn't give away answers
const TranslationToggle = ({ translation, show, onToggle }) => (
  <div className="mt-2 flex flex-col items-center gap-1">
    <button
      onClick={onToggle}
      className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors flex items-center gap-1"
    >
      <svg className={`w-3 h-3 transition-transform ${show ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {show ? "Hide translation" : "Show translation"}
    </button>
    {show && (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        {translation}
      </p>
    )}
  </div>
);

// ─── Audio ─────────────────────────────────────────────────────────────────
const playAudio = async (audioRaw) => {
  if (!audioRaw) return;
  const match = audioRaw.match(/\[sound:([^\]]+)\]/);
  if (!match) return;
  const filename = match[1].trim();
  try {
    let base64 = await mediaCacheService.getCachedMedia(filename);
    if (!base64) {
      base64 = await ankiConnect.retrieveMediaFile(filename);
      if (base64) mediaCacheService.setCachedMedia(filename, base64);
    }
    if (!base64) return;
    const ext = filename.split(".").pop()?.toLowerCase() || "mp3";
    const mimeType =
      ext === "mp3" ? "audio/mpeg" :
      ext === "wav" ? "audio/wav" :
      ext === "ogg" ? "audio/ogg" :
      `audio/${ext}`;
    new Audio(`data:${mimeType};base64,${base64}`).play().catch(() => {});
  } catch {
    // silently ignore audio errors
  }
};

// Small audio play button
const AudioBtn = ({ audioRaw }) => {
  if (!audioRaw) return null;
  return (
    <button
      onClick={() => playAudio(audioRaw)}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors shrink-0"
      aria-label="Play pronunciation"
      title="Play pronunciation"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>
  );
};

// ─── Review card shown after answering ─────────────────────────────────────
const ReviewCard = ({ option, variant, sentences, sentenceTranslation, audioRaw, fontMaxIndex, centered }) => {
  const isCorrect = variant === "correct";
  const baseClass = isCorrect
    ? "border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/25"
    : "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/25";
  const labelClass = isCorrect
    ? "text-green-600 dark:text-green-400"
    : "text-red-500 dark:text-red-400";
  const wordClass = isCorrect
    ? "text-green-900 dark:text-green-100"
    : "text-red-900 dark:text-red-100";
  const dividerClass = isCorrect
    ? "border-green-200 dark:border-green-800/60"
    : "border-red-200 dark:border-red-800/60";
  const align = centered ? "items-center text-center" : "items-start";

  return (
    <div className={`w-full rounded-2xl border-2 px-6 py-5 flex flex-col gap-2 ${baseClass}`}>
      {/* Header row */}
      <div className={`flex ${centered ? "justify-center" : "justify-between"} items-center`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${labelClass}`}>
          {isCorrect ? "✓ Correct" : "✗ You picked"}
        </span>
        {isCorrect && !centered && <AudioBtn audioRaw={audioRaw} />}
      </div>

      {/* Word (hanzi) — adaptive font same as options */}
      <div className={`flex flex-col gap-1.5 ${align}`}>
        {option.word && (
          <div className={`font-bold leading-tight ${wordClass} ${adaptiveFont(option.word, fontMaxIndex ?? 4)}`}>
            {option.word}
          </div>
        )}

        {/* Audio button centered below word */}
        {isCorrect && centered && <AudioBtn audioRaw={audioRaw} />}

        {/* Pronunciation */}
        {option.pronunciation && (
          <div className="text-blue-500 dark:text-blue-400 text-xl font-medium">
            {option.pronunciation}
          </div>
        )}

        {/* Meaning */}
        {option.meaning && (
          <div className="text-gray-700 dark:text-gray-200 text-lg leading-snug">
            {option.meaning}
          </div>
        )}
      </div>

      {/* Example sentences */}
      {sentences?.length > 0 && (
        <div className={`mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t ${dividerClass} pt-3 flex flex-col gap-2 ${centered ? "text-center" : ""}`}>
          {sentences.map((s, i) => (
            <div key={i}>
              <SentenceWithHighlight sentence={s} word={option.word} />
            </div>
          ))}
          {sentenceTranslation && (
            <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{sentenceTranslation}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Word profile card (neutral / colored) ─────────────────────────────────
const WORD_CARD_VARIANTS = {
  neutral: {
    border: "border-gray-200 dark:border-gray-700",
    bg:     "bg-white dark:bg-gray-800",
    label:  "text-gray-400 dark:text-gray-500",
    divider:"border-gray-100 dark:border-gray-700",
  },
  correct: {
    border: "border-green-400 dark:border-green-500",
    bg:     "bg-green-50 dark:bg-green-900/25",
    label:  "text-green-600 dark:text-green-400",
    divider:"border-green-200 dark:border-green-800/60",
  },
  wrong: {
    border: "border-red-400 dark:border-red-500",
    bg:     "bg-red-50 dark:bg-red-900/25",
    label:  "text-red-500 dark:text-red-400",
    divider:"border-red-200 dark:border-red-800/60",
  },
};

const WordProfileCard = ({ word, pronunciation, meaning, sentences, sentenceTranslation, label, variant = "neutral" }) => {
  const v = WORD_CARD_VARIANTS[variant] ?? WORD_CARD_VARIANTS.neutral;
  return (
    <div className={`flex-1 rounded-2xl border-2 px-5 py-4 flex flex-col gap-1.5 ${v.border} ${v.bg}`}>
      {label && (
        <span className={`text-xs font-bold uppercase tracking-widest ${v.label}`}>{label}</span>
      )}
      {word && (
        <div className={`font-bold text-gray-900 dark:text-gray-100 leading-tight ${adaptiveFont(word, 4)}`}>
          {word}
        </div>
      )}
      {pronunciation && (
        <div className="text-blue-500 dark:text-blue-400 text-lg font-medium">{pronunciation}</div>
      )}
      {meaning && (
        <div className="text-gray-700 dark:text-gray-200 text-base leading-snug">{meaning}</div>
      )}
      {sentences?.length > 0 && (
        <div className={`mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t ${v.divider} pt-2 flex flex-col gap-1.5`}>
          {sentences.map((s, i) => (
            <div key={i}>
              <SentenceWithHighlight sentence={s} word={word} />
            </div>
          ))}
          {sentenceTranslation && (
            <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{sentenceTranslation}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Pair Drill helpers ─────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

/** Convert confusionReport into { target, foil } pairs (deduped) */
const buildDrillPairs = (report) => {
  if (!report) return [];
  const seen = new Set();
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

/** Generate 2-option quiz questions from confusion pairs */
const buildPairQuestions = (pairs) => {
  const qs = [];
  for (const pair of pairs) {
    const { target, foil } = pair;
    if (target.meaning && foil.meaning) {
      // word → meaning
      const opts1 = shuffle([
        { text: target.meaning, isTarget: true,  ...target },
        { text: foil.meaning,   isTarget: false, ...foil   },
      ]);
      qs.push({ pair, promptLabel: "Which meaning matches?", prompt: target.word, answer: target.meaning, options: opts1, correctIndex: opts1.findIndex((o) => o.isTarget) });
      // meaning → word
      const opts2 = shuffle([
        { text: target.word, isTarget: true,  ...target },
        { text: foil.word,   isTarget: false, ...foil   },
      ]);
      qs.push({ pair, promptLabel: "Which word matches?", prompt: target.meaning, answer: target.word, options: opts2, correctIndex: opts2.findIndex((o) => o.isTarget) });
    }
  }
  return shuffle(qs);
};

// ─── Pair Drill component ───────────────────────────────────────────────────
const PairDrill = ({ pairs, onFinish, onClose }) => {
  const [phase,    setPhase]    = useState("study"); // "study" | "test"
  const [questions, setQuestions] = useState([]);
  const [qIndex,   setQIndex]   = useState(0);
  const [selected, setSelected] = useState(null);

  const practiceFontSize = useStore((s) => s.settings?.practiceFontSize || "xlarge");
  const practiceMaxIndex = PRACTICE_SIZE_TO_MAX_INDEX[practiceFontSize] ?? 4;

  const startTest = useCallback(() => {
    setQuestions(buildPairQuestions(pairs));
    setQIndex(0);
    setSelected(null);
    setPhase("test");
  }, [pairs]);

  const handleAnswer = useCallback((i) => {
    if (selected !== null) return;
    setSelected(i);
    const q = questions[qIndex];
    if (i !== q.correctIndex) {
      setQuestions((prev) => {
        const next = [...prev];
        next.splice(Math.min(qIndex + 3, prev.length), 0, q);
        return next;
      });
    }
  }, [selected, questions, qIndex]);

  const handleAdvance = useCallback(() => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      onFinish();
    } else {
      setQIndex(next);
      setSelected(null);
    }
  }, [qIndex, questions.length, onFinish]);

  useEffect(() => {
    if (phase !== "test" || selected === null) return;
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selected, handleAdvance]);

  const q = questions[qIndex];
  const isAnswered = selected !== null;
  const isCorrect  = isAnswered && q && selected === q.correctIndex;
  const isWrong    = isAnswered && !isCorrect;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {phase === "study"
            ? `Confused pairs · ${pairs.length} to review`
            : `Pair drill · ${qIndex + 1} / ${questions.length}`}
        </span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Study phase ─────────────────────────────────────────── */}
        {phase === "study" && (
          <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Review the pairs you confused — notice the differences before the quiz.
            </p>
            {pairs.map((pair, i) => (
              <div key={i} className="flex gap-3">
                <WordProfileCard
                  label="Target word"
                  variant="correct"
                  {...pair.target}
                />
                <WordProfileCard
                  label="Confused with"
                  variant="neutral"
                  {...pair.foil}
                />
              </div>
            ))}
            <button
              onClick={startTest}
              className="mt-2 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-base transition-colors"
            >
              Start Quiz →
            </button>
          </div>
        )}

        {/* ── Test phase ──────────────────────────────────────────── */}
        {phase === "test" && q && (
          <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5 w-full">
            {/* Question card */}
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-8 py-7 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
                {q.promptLabel}
              </p>
              <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight break-words ${adaptiveFont(q.prompt, practiceMaxIndex)}`}>
                {q.prompt}
              </p>
            </div>

            {/* 2-option buttons */}
            {!isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className="w-full rounded-2xl border-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-all duration-150 px-6 py-5 flex flex-col items-center gap-1"
                  >
                    <span className={`font-bold leading-tight break-words ${adaptiveFont(opt.text, practiceMaxIndex)} text-gray-900 dark:text-gray-100`}>
                      {opt.text}
                    </span>
                    {opt.pronunciation && (
                      <span className="text-sm text-gray-400 dark:text-gray-500">{opt.pronunciation}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* After answering: side-by-side comparison + next */}
            {isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-3">
                  <WordProfileCard
                    label="✓ Correct"
                    variant="correct"
                    {...q.pair.target}
                  />
                  <WordProfileCard
                    label={isWrong ? "✗ You picked" : "Also review"}
                    variant={isWrong ? "wrong" : "neutral"}
                    {...q.pair.foil}
                  />
                </div>
                <button
                  onClick={handleAdvance}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
                    isCorrect
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {qIndex + 1 >= questions.length ? "Finish" : isCorrect ? "Next →" : "Got it, next →"}
                  <span className="ml-2 text-xs opacity-60 font-normal">Space</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── End Screen ────────────────────────────────────────────────────────────
const EndScreen = ({ report, onRestart, onDrillPairs, onClose }) => {
  const [weakOnly, setWeakOnly] = useState(false);

  const pct = report.total > 0 ? Math.round((report.score / report.total) * 100) : 0;

  const scoreColor =
    pct >= 80 ? "text-green-600 dark:text-green-400" :
    pct >= 50 ? "text-amber-500 dark:text-amber-400" :
                "text-red-600 dark:text-red-400";

  const handleRestart = () => {
    const weakNoteIds = weakOnly
      ? report.confusedWords.map((w) => w.noteId)
      : null;
    onRestart(weakNoteIds);
  };

  return (
    <div className="flex flex-col items-center justify-start h-full overflow-y-auto px-6 py-10 gap-8 max-w-2xl mx-auto w-full">
      {/* Score */}
      <div className="text-center">
        <div className={`text-7xl font-bold tabular-nums ${scoreColor}`}>
          {pct}%
        </div>
        <div className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
          {report.score} / {report.total} correct
        </div>
      </div>

      {/* Confused words */}
      {report.confusedWords.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
            Needs attention
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {report.confusedWords.slice(0, 10).map((w, i) => (
              <div key={i} className="px-5 py-4 bg-white dark:bg-gray-800">
                {/* Header row: hanzi + error count */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {w.word}
                  </span>
                  <span className="text-sm text-red-500 dark:text-red-400 font-semibold shrink-0 mt-1">
                    {w.errors}✗
                  </span>
                </div>
                {/* Pronunciation + meaning */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                  {w.pronunciation && (
                    <span className="text-base text-blue-600 dark:text-blue-400">{w.pronunciation}</span>
                  )}
                  {w.meaning && (
                    <span className="text-base text-green-700 dark:text-green-400">{w.meaning}</span>
                  )}
                </div>
                {/* Wrong picks */}
                {w.wrongPicks.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {w.wrongPicks.map((pick, j) => (
                      <div
                        key={j}
                        className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs text-red-400 dark:text-red-500 shrink-0">picked</span>
                          <span className="text-xl font-bold text-red-700 dark:text-red-300 leading-tight">{pick.text}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-0.5">
                          {pick.pronunciation && (
                            <span className="text-sm text-blue-600 dark:text-blue-400">{pick.pronunciation}</span>
                          )}
                          {pick.meaning && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">{pick.meaning}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confused characters */}
      {report.confusedChars.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Weak characters
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Characters that appear in words you missed — number shows total mistakes
          </p>
          <div className="flex flex-wrap gap-2">
            {report.confusedChars.map(({ char, count }) => (
              <div
                key={char}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{char}</span>
                <span className="text-xs text-red-500 dark:text-red-400">✗{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.confusedWords.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🎉</div>
          <p>Perfect session — no mistakes!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        {report.confusedWords.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer self-start">
            <input
              type="checkbox"
              checked={weakOnly}
              onChange={(e) => setWeakOnly(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Only weak words ({report.confusedWords.length})
            </span>
          </label>
        )}
        {report.confusedWords.length > 0 && onDrillPairs && (
          <button
            onClick={onDrillPairs}
            className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold text-sm"
          >
            Drill confused pairs ({report.confusedWords.length})
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Practice again
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Session ───────────────────────────────────────────────────────────────
const PracticeSession = ({ sessionOptions, onClose }) => {
  const session = usePracticeSession();
  const practiceFontSize = useStore((s) => s.settings?.practiceFontSize || "xlarge");
  const practiceMaxIndex = PRACTICE_SIZE_TO_MAX_INDEX[practiceFontSize] ?? 4;
  const [drillPairs, setDrillPairs] = useState(null); // non-null = show PairDrill

  const doStart = useCallback((weakNoteIds = null) => {
    if (!sessionOptions) return;
    const notes = weakNoteIds
      ? sessionOptions.notes.filter((n) => weakNoteIds.includes(n.noteId))
      : sessionOptions.notes;
    session.start(notes, sessionOptions.exerciseType, sessionOptions.view);
  }, [sessionOptions]);

  // Start on mount
  useEffect(() => { doStart(); }, []);

  const { phase, current: questionIndex, currentQuestion, selected, revealed, progress, score, errors, confusionReport, advance, reveal, selfRate } = session;

  // Translation visibility — hidden by default, resets on every new question
  const [showTranslation, setShowTranslation] = useState(false);
  useEffect(() => { setShowTranslation(false); }, [questionIndex]);

  const isRecall    = currentQuestion?.type === TYPES.RECALL;
  const isAnswered  = selected !== null;
  const isWrong     = isAnswered && selected !== currentQuestion?.correctIndex;
  const isCorrect   = isAnswered && selected === currentQuestion?.correctIndex;

  // Sentence is already visible in the question card for these types — don't repeat in review
  const sentenceAlreadyShown =
    currentQuestion?.type === TYPES.WORD_MEANING ||
    currentQuestion?.type === TYPES.WORD_PRONUNCIATION ||
    currentQuestion?.type === TYPES.SENTENCE_CLOZE;
  const reviewSentences = sentenceAlreadyShown ? [] : (currentQuestion?.sentences ?? []);
  const reviewSentenceTranslation = sentenceAlreadyShown ? "" : (currentQuestion?.sentenceTranslation ?? "");

  // Auto-play audio:
  // - Multiple choice: any answer (correct or wrong) → play correct word audio
  // - Recall: on reveal
  useEffect(() => {
    if (!isRecall && isAnswered && currentQuestion?.audioRaw) {
      playAudio(currentQuestion.audioRaw);
    }
  }, [isRecall, isAnswered, currentQuestion?.audioRaw]);

  useEffect(() => {
    if (isRecall && revealed && currentQuestion?.audioRaw) {
      playAudio(currentQuestion.audioRaw);
    }
  }, [isRecall, revealed, currentQuestion?.audioRaw]);

  // Keyboard shortcuts (must be before any conditional return)
  useEffect(() => {
    if (phase !== "playing" || drillPairs) return;
    const onKey = (e) => {
      if (isRecall) {
        if (!revealed && (e.code === "Space" || e.code === "Enter")) {
          e.preventDefault();
          reveal();
        } else if (revealed) {
          if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
            e.preventDefault();
            selfRate(true);
          } else if (e.code === "ArrowLeft") {
            e.preventDefault();
            selfRate(false);
          }
        }
      } else {
        if ((e.code === "Space" || e.code === "Enter") && isAnswered) {
          e.preventDefault();
          advance();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, drillPairs, isRecall, revealed, isAnswered, reveal, selfRate, advance]);

  // Pair drill mode — rendered as full-screen overlay (all hooks run before this)
  if (drillPairs) {
    return (
      <PairDrill
        pairs={drillPairs}
        onFinish={() => setDrillPairs(null)}
        onClose={onClose}
      />
    );
  }

  // ── Option appearance (pre-answer grid) ───────────────────────────────
  const optionBase =
    "relative w-full rounded-2xl border-2 transition-all duration-150 text-center px-5 py-6 flex flex-col items-center justify-center gap-1 min-h-[96px]";

  const optionStyle = (i) => {
    if (selected === null) {
      return `${optionBase} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer`;
    }
    if (i === currentQuestion.correctIndex) {
      return `${optionBase} bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 cursor-default`;
    }
    if (i === selected) {
      return `${optionBase} bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-500 cursor-default`;
    }
    return `${optionBase} bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-40 cursor-default`;
  };

  const optionTextColor = (i) => {
    if (selected === null) return "text-gray-900 dark:text-gray-100";
    if (i === currentQuestion.correctIndex) return "text-green-800 dark:text-green-200";
    if (i === selected) return "text-red-800 dark:text-red-200";
    return "text-gray-500 dark:text-gray-400";
  };

  // Helper: display text for an option object
  const optText = (opt) => opt?.text ?? opt ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          aria-label="Close practice"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {phase === "playing" && (
          <>
            <div className="flex-1 mx-6">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${((progress.current - 1) / progress.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0">
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                {progress.current} / {progress.total}
              </span>
              <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums">
                ✓ {score}
              </span>
              <span className="text-red-500 dark:text-red-400 font-semibold tabular-nums">
                ✗ {errors}
              </span>
            </div>
          </>
        )}

        {phase === "finished" && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mx-auto">
            Session complete
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">

        {phase === "playing" && currentQuestion && (
          <div className="w-full max-w-4xl px-6 py-6 flex flex-col items-center gap-5">
            {/* Question card */}
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-8 py-7 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
                {currentQuestion.promptLabel}
              </p>

              {currentQuestion.type === TYPES.SENTENCE_CLOZE ? (
                <>
                  <p className={`text-gray-900 dark:text-gray-100 leading-relaxed ${adaptiveFont(currentQuestion.prompt, Math.max(1, practiceMaxIndex - 1))}`}>
                    <ClozePrompt prompt={currentQuestion.prompt} />
                  </p>
                  {currentQuestion.sentenceTranslation && (
                    <TranslationToggle
                      translation={currentQuestion.sentenceTranslation}
                      show={showTranslation}
                      onToggle={() => setShowTranslation((v) => !v)}
                    />
                  )}
                </>
              ) : (
                <>
                  <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight break-words ${adaptiveFont(currentQuestion.prompt, practiceMaxIndex)}`}>
                    {currentQuestion.prompt}
                  </p>
                  {/* Sentence context — only for types where the word IS the prompt */}
                  {currentQuestion.sentence &&
                    (currentQuestion.type === TYPES.WORD_MEANING ||
                     currentQuestion.type === TYPES.WORD_PRONUNCIATION) && (
                    <>
                      <p className={`mt-5 text-gray-500 dark:text-gray-400 leading-relaxed ${adaptiveFont(currentQuestion.prompt, practiceMaxIndex)}`}>
                        <SentenceWithHighlight
                          sentence={currentQuestion.sentence}
                          word={currentQuestion.word}
                        />
                      </p>
                      {currentQuestion.sentenceTranslation && (
                        <TranslationToggle
                          translation={currentQuestion.sentenceTranslation}
                          show={showTranslation}
                          onToggle={() => setShowTranslation((v) => !v)}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* ══ RECALL MODE ══════════════════════════════════════════ */}
            {isRecall && !revealed && (
              <button
                onClick={reveal}
                className="w-full py-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 font-medium text-lg cursor-pointer"
              >
                Tap to reveal
                <span className="ml-2 text-sm opacity-60">Space</span>
              </button>
            )}

            {isRecall && revealed && (
              <div className="flex flex-col gap-3 w-full">
                {/* Revealed card — full word profile */}
                <div className="w-full rounded-2xl border-2 border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 px-6 py-5 flex flex-col items-center gap-2 text-center">
                  <div className={`font-bold leading-tight text-gray-900 dark:text-gray-100 ${adaptiveFont(currentQuestion.word, practiceMaxIndex)}`}>
                    {currentQuestion.word}
                  </div>
                  <AudioBtn audioRaw={currentQuestion.audioRaw} />
                  {currentQuestion.pronunciation && (
                    <div className="text-blue-500 dark:text-blue-400 text-2xl font-medium">
                      {currentQuestion.pronunciation}
                    </div>
                  )}
                  {currentQuestion.meaning && (
                    <div className="text-gray-700 dark:text-gray-200 text-xl leading-snug">
                      {currentQuestion.meaning}
                    </div>
                  )}
                  {currentQuestion.sentences?.length > 0 && (
                    <div className="mt-2 text-base text-gray-500 dark:text-gray-400 leading-relaxed border-t border-purple-200 dark:border-purple-800/60 pt-3 w-full flex flex-col gap-2">
                      {currentQuestion.sentences.map((s, i) => (
                        <div key={i}>
                          <SentenceWithHighlight sentence={s} word={currentQuestion.word} />
                        </div>
                      ))}
                      {currentQuestion.sentenceTranslation && (
                        <div className="text-sm text-gray-400 dark:text-gray-500 italic mt-0.5">{currentQuestion.sentenceTranslation}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Self-rating buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => selfRate(false)}
                    className="py-4 rounded-2xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold text-base"
                  >
                    ✗ Not yet
                    <span className="ml-2 text-xs opacity-50 font-normal">←</span>
                  </button>
                  <button
                    onClick={() => selfRate(true)}
                    className="py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white transition-colors font-semibold text-base"
                  >
                    ✓ Know it
                    <span className="ml-2 text-xs opacity-70 font-normal">Space</span>
                  </button>
                </div>
              </div>
            )}

            {/* ══ MULTIPLE CHOICE MODE ═════════════════════════════════ */}
            {!isRecall && !isAnswered && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {currentQuestion.options.map((opt, i) => {
                  // Pronunciation hint only for types where options are NOT pronunciations
                  // and where the hint doesn't mirror the prompt.
                  // Whitelist: WORD_MEANING (options=meanings) and MEANING_WORD (options=words).
                  const hint =
                    (currentQuestion.type === TYPES.WORD_MEANING ||
                     currentQuestion.type === TYPES.MEANING_WORD)
                      ? opt.pronunciation
                      : null;
                  return (
                    <button
                      key={i}
                      onClick={() => session.answer(i)}
                      className={optionStyle(i)}
                    >
                      <span className={`font-bold leading-tight break-words ${adaptiveFont(optText(opt), practiceMaxIndex)} ${optionTextColor(i)}`}>
                        {optText(opt)}
                      </span>
                      {hint && (
                        <span className="text-sm font-normal leading-tight opacity-50">
                          {hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!isRecall && isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                {/* Correct + wrong cards — side by side when both visible */}
                <div className={`grid gap-3 w-full ${isWrong ? "grid-cols-2" : "grid-cols-1"}`}>
                  <ReviewCard
                    option={currentQuestion.options[currentQuestion.correctIndex]}
                    variant="correct"
                    sentences={isWrong
                      ? (currentQuestion.options[currentQuestion.correctIndex].sentences ?? currentQuestion.sentences)
                      : reviewSentences}
                    sentenceTranslation={isWrong
                      ? (currentQuestion.options[currentQuestion.correctIndex].sentenceTranslation ?? currentQuestion.sentenceTranslation)
                      : reviewSentenceTranslation}
                    audioRaw={currentQuestion.audioRaw}
                    fontMaxIndex={practiceMaxIndex}
                    centered={!isWrong}
                  />
                  {isWrong && (
                    <ReviewCard
                      option={currentQuestion.options[selected]}
                      variant="wrong"
                      sentences={currentQuestion.options[selected].sentences}
                      sentenceTranslation={currentQuestion.options[selected].sentenceTranslation}
                      fontMaxIndex={practiceMaxIndex}
                    />
                  )}
                </div>

                {/* Next button */}
                <button
                  onClick={advance}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
                    isCorrect
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {isCorrect ? "Next →" : "Got it, next →"}
                  <span className="ml-2 text-xs opacity-60 font-normal">Space</span>
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "finished" && confusionReport && (
          <EndScreen
            report={confusionReport}
            onRestart={(weakNoteIds) => doStart(weakNoteIds)}
            onDrillPairs={() => setDrillPairs(buildDrillPairs(confusionReport))}
            onClose={onClose}
          />
        )}

        {phase === "idle" && (
          <div className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeSession;
