/**
 * PracticeSession
 * Full-screen overlay — active session + end-screen confusion report.
 */

import { useEffect, useCallback, useState } from "react";
import { usePracticeSession } from "../../hooks/usePracticeSession";

// Step down from text-5xl based on text length.
// Chinese chars are square (wide), Latin chars are narrower — but length is still
// the best single proxy without DOM measurement.
const FONT_SIZES = ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];

const adaptiveFont = (text, maxIndex = 5) => {
  const len = (text || "").length;
  const step = len > 45 ? 4 : len > 28 ? 3 : len > 15 ? 2 : len > 8 ? 1 : 0;
  return FONT_SIZES[Math.max(0, maxIndex - step)];
};

// ─── End Screen ────────────────────────────────────────────────────────────
const EndScreen = ({ report, onRestart, onClose }) => {
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
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
            Weak characters
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.confusedChars.map(({ char, count }) => (
              <div
                key={char}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{char}</span>
                <span className="text-xs text-red-500 dark:text-red-400">{count}w</span>
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

  const doStart = useCallback((weakNoteIds = null) => {
    if (!sessionOptions) return;
    const notes = weakNoteIds
      ? sessionOptions.notes.filter((n) => weakNoteIds.includes(n.noteId))
      : sessionOptions.notes;
    session.start(notes, sessionOptions.exerciseType, sessionOptions.view);
  }, [sessionOptions]);

  // Start on mount
  useEffect(() => { doStart(); }, []);

  const { phase, currentQuestion, selected, progress, score, errors, confusionReport } = session;

  // ── Option appearance ─────────────────────────────────────────────────
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

  // Show "→ correct answer" below wrong pick — space is always reserved to prevent layout shift
  const hintText = (i) => {
    if (selected === null) return "";
    if (i === selected && i !== currentQuestion.correctIndex) {
      return `→ ${currentQuestion.answer}`;
    }
    return "";
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
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-10 py-10 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
                {currentQuestion.promptLabel}
              </p>
              <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight break-words ${adaptiveFont(currentQuestion.prompt, 5)}`}>
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Answer options — 2×3 grid (6 options) */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => session.answer(i)}
                  disabled={selected !== null}
                  className={optionStyle(i)}
                >
                  {/* Main option text — font scales with length */}
                  <span className={`font-bold leading-tight break-words ${adaptiveFont(optText(opt), 5)} ${optionTextColor(i)}`}>
                    {optText(opt)}
                  </span>
                  {/* Reserved hint line — always rendered, invisible when not needed */}
                  <span
                    className={`text-xs font-normal leading-none transition-opacity duration-200 ${
                      hintText(i)
                        ? "text-red-500 dark:text-red-400 opacity-100"
                        : "opacity-0 select-none"
                    }`}
                    aria-hidden={!hintText(i)}
                  >
                    {hintText(i) || "·"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "finished" && confusionReport && (
          <EndScreen
            report={confusionReport}
            onRestart={(weakNoteIds) => doStart(weakNoteIds)}
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
