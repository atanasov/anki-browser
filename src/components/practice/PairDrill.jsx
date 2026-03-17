import { useState, useCallback, useEffect, useRef } from "react";
import useStore from "../../store";
import { adaptiveFont, shuffle, PRACTICE_SIZE_TO_MAX_INDEX } from "./practiceUtils";
import WordProfileCard from "./WordProfileCard";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert confusionReport into { target, foil } pairs (deduped) */
export const buildDrillPairs = (report) => {
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

const buildPairQuestions = (pairs) => {
  const qs = [];
  for (const pair of pairs) {
    const { target, foil } = pair;
    if (target.meaning && foil.meaning) {
      const opts1 = shuffle([
        { text: target.meaning, isTarget: true,  ...target },
        { text: foil.meaning,   isTarget: false, ...foil   },
      ]);
      qs.push({ pair, promptLabel: "Which meaning matches?", prompt: target.word, answer: target.meaning, options: opts1, correctIndex: opts1.findIndex((o) => o.isTarget) });
      const opts2 = shuffle([
        { text: target.word, isTarget: true,  ...target },
        { text: foil.word,   isTarget: false, ...foil   },
      ]);
      qs.push({ pair, promptLabel: "Which word matches?", prompt: target.meaning, answer: target.word, options: opts2, correctIndex: opts2.findIndex((o) => o.isTarget) });
    }
  }
  return shuffle(qs);
};

// ── Component ─────────────────────────────────────────────────────────────────

const PairDrill = ({ pairs, onFinish, onClose }) => {
  const [phase,        setPhase]        = useState("study"); // "study" | "test" | "done"
  const [questions,    setQuestions]    = useState([]);
  const [qIndex,       setQIndex]       = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [firstCorrect, setFirstCorrect] = useState(0);
  const [firstTotal,   setFirstTotal]   = useState(0);
  const seenKeys = useRef(new Set()).current;

  const practiceFontSize = useStore((s) => s.settings?.practiceFontSize || "xlarge");
  const practiceMaxIndex = PRACTICE_SIZE_TO_MAX_INDEX[practiceFontSize] ?? 4;

  const optionRefs = useRef([]);

  const startTest = useCallback(() => {
    const qs = buildPairQuestions(pairs);
    setQuestions(qs);
    setQIndex(0);
    setSelected(null);
    setFirstCorrect(0);
    setFirstTotal(0);
    seenKeys.clear();
    setPhase("test");
  }, [pairs, seenKeys]);

  const handleAnswer = useCallback((i) => {
    if (selected !== null) return;
    setSelected(i);
    const q = questions[qIndex];
    const correct = i === q.correctIndex;
    const key = `${q.prompt}|${q.answer}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      setFirstTotal((n) => n + 1);
      if (correct) setFirstCorrect((n) => n + 1);
    }
    if (!correct) {
      setQuestions((prev) => {
        const next = [...prev];
        next.splice(Math.min(qIndex + 3, prev.length), 0, q);
        return next;
      });
    }
  }, [selected, questions, qIndex, seenKeys]);

  const handleAdvance = useCallback(() => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      setPhase("done");
    } else {
      setQIndex(next);
      setSelected(null);
    }
  }, [qIndex, questions.length]);

  // Keyboard shortcuts — window listener so focus location doesn't matter
  useEffect(() => {
    if (phase !== "test") return;
    const onKey = (e) => {
      if (selected !== null) {
        if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); handleAdvance(); }
      } else {
        const num = parseInt(e.key, 10);
        if (num === 1 || num === 2) {
          const btn = optionRefs.current[num - 1];
          if (btn) { e.preventDefault(); btn.click(); }
        }
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

        {/* Study phase */}
        {phase === "study" && (
          <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Review the pairs you confused — notice the differences before the quiz.
            </p>
            {pairs.map((pair, i) => (
              <div key={i} className="flex gap-3">
                <WordProfileCard label="Target word" variant="correct" fontMaxIndex={practiceMaxIndex} {...pair.target} />
                <WordProfileCard label="Confused with" variant="neutral" fontMaxIndex={practiceMaxIndex} {...pair.foil} />
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

        {/* Test phase */}
        {phase === "test" && q && (
          <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5 w-full">
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-8 py-7 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
                {q.promptLabel}
              </p>
              <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight ${adaptiveFont(q.prompt, practiceMaxIndex)}`}>
                {q.prompt}
              </p>
            </div>

            {!isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    onClick={() => handleAnswer(i)}
                    className="relative w-full rounded-2xl border-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-all duration-150 px-6 py-5 flex flex-col items-center gap-1"
                  >
                    <span className="absolute top-2 left-2.5 text-xs font-semibold opacity-30 leading-none select-none">
                      {i + 1}
                    </span>
                    <span className={`font-bold leading-tight ${adaptiveFont(opt.text, practiceMaxIndex)} text-gray-900 dark:text-gray-100`}>
                      {opt.text}
                    </span>
                    {opt.pronunciation && (
                      <span className="text-sm text-gray-400 dark:text-gray-500">{opt.pronunciation}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-3">
                  <WordProfileCard label="✓ Correct" variant="correct" fontMaxIndex={practiceMaxIndex} {...q.pair.target} />
                  <WordProfileCard
                    label={isWrong ? "✗ You picked" : "Also review"}
                    variant={isWrong ? "wrong" : "neutral"}
                    fontMaxIndex={practiceMaxIndex}
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

        {/* Done phase */}
        {phase === "done" && (
          <div className="max-w-md mx-auto px-6 py-16 flex flex-col items-center gap-6 text-center">
            <div className={`text-7xl font-bold tabular-nums ${
              firstCorrect === firstTotal ? "text-green-600 dark:text-green-400" :
              firstCorrect / firstTotal >= 0.7 ? "text-amber-500 dark:text-amber-400" :
              "text-red-500 dark:text-red-400"
            }`}>
              {firstTotal > 0 ? Math.round((firstCorrect / firstTotal) * 100) : 100}%
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              {firstCorrect} / {firstTotal} correct on first attempt
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {firstCorrect === firstTotal
                ? "All pairs cleared — great work!"
                : "Wrong answers were re-queued until you got them right."}
            </p>
            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={startTest}
                className="w-full py-3 border border-purple-400 dark:border-purple-600 text-purple-600 dark:text-purple-400 rounded-xl font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                Drill again
              </button>
              <button
                onClick={onFinish}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
              >
                Back to results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairDrill;
