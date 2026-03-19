/**
 * PracticeSession
 * Full-screen overlay — active session + end-screen confusion report.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { usePracticeSession, TYPES } from "../../hooks/usePracticeSession";
import useStore from "../../store";
import { adaptiveFont, playAudio, PRACTICE_SIZE_TO_MAX_INDEX } from "./practiceUtils";
import { SentenceWithHighlight, ClozePrompt } from "./SentenceHighlight";
import AudioBtn from "./AudioBtn";
import WordCard from "./WordCard";
import PairDrill from "./PairDrill";
import { buildDrillPairs } from "./questionBuilder";
import EndScreen from "./EndScreen";

// Collapsible translation hint
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
    {show && <p className="text-sm text-gray-400 dark:text-gray-500 italic">{translation}</p>}
  </div>
);

// ── Option button styles ──────────────────────────────────────────────────────

const OPTION_BASE = "relative w-full rounded-2xl border-2 transition-all duration-150 text-center px-5 py-6 flex flex-col items-center justify-center gap-1 min-h-[96px]";

const optionStyle = (i, selected, correctIndex) => {
  if (selected === null) {
    return `${OPTION_BASE} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer`;
  }
  if (i === correctIndex) return `${OPTION_BASE} bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 cursor-default`;
  if (i === selected)    return `${OPTION_BASE} bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-500 cursor-default`;
  return `${OPTION_BASE} bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-40 cursor-default`;
};

const optionTextColor = (i, selected, correctIndex) => {
  if (selected === null) return "text-gray-900 dark:text-gray-100";
  if (i === correctIndex) return "text-green-800 dark:text-green-200";
  if (i === selected)     return "text-red-800 dark:text-red-200";
  return "text-gray-500 dark:text-gray-400";
};

const optText = (opt) => opt?.text ?? opt ?? "";

// ── Main component ────────────────────────────────────────────────────────────

const PracticeSession = ({ sessionOptions, onClose }) => {
  const session = usePracticeSession();
  const practiceFontSize = useStore((s) => s.settings?.practiceFontSize || "xlarge");
  const practiceMaxIndex = PRACTICE_SIZE_TO_MAX_INDEX[practiceFontSize] ?? 4;
  const [drillPairs, setDrillPairs] = useState(null);

  const doStart = useCallback((weakNoteIds = null) => {
    if (!sessionOptions) return;
    const notes = weakNoteIds
      ? sessionOptions.notes.filter((n) => weakNoteIds.includes(n.noteId))
      : sessionOptions.notes;
    session.start(notes, sessionOptions.exerciseType, sessionOptions.view);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionOptions]); // session.start is stable (useCallback with no deps)

  useEffect(() => { doStart(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { phase, current: questionIndex, currentQuestion, selected, revealed, progress, score, errors, confusionReport, advance, reveal, selfRate } = session;

  const [showTranslation, setShowTranslation] = useState(false);
  useEffect(() => { setShowTranslation(false); }, [questionIndex]);

  const isRecall   = currentQuestion?.type === TYPES.RECALL;
  const isGaveUp   = selected === -1;
  const isAnswered = selected !== null;
  const isWrong    = isAnswered && !isGaveUp && selected !== currentQuestion?.correctIndex;
  const isCorrect  = isAnswered && !isGaveUp && selected === currentQuestion?.correctIndex;

  // SENTENCE_CLOZE intentionally excluded: the cloze shows [___], after answer we want the completed sentence
  const sentenceAlreadyShown =
    currentQuestion?.type === TYPES.WORD_MEANING ||
    currentQuestion?.type === TYPES.WORD_PRONUNCIATION;
  const reviewSentences           = sentenceAlreadyShown ? [] : (currentQuestion?.sentences ?? []);
  const reviewSentenceTranslation = sentenceAlreadyShown ? "" : (currentQuestion?.sentenceTranslation ?? "");

  // Auto-play audio after answering
  useEffect(() => {
    if (!isRecall && isAnswered && currentQuestion?.audioRaw) playAudio(currentQuestion.audioRaw);
  }, [isRecall, isAnswered, currentQuestion?.audioRaw]);

  useEffect(() => {
    if (isRecall && revealed && currentQuestion?.audioRaw) playAudio(currentQuestion.audioRaw);
  }, [isRecall, revealed, currentQuestion?.audioRaw]);

  const optionRefs = useRef([]);

  // Blur any focused element behind the overlay so it can't swallow keyboard events
  useEffect(() => { document.activeElement?.blur(); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "playing" || drillPairs) return;
    const onKey = (e) => {
      if (isRecall) {
        if (!revealed && (e.code === "Space" || e.code === "Enter")) {
          e.preventDefault(); reveal();
        } else if (revealed) {
          if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") { e.preventDefault(); selfRate(true); }
          else if (e.code === "ArrowLeft") { e.preventDefault(); selfRate(false); }
        }
      } else {
        if ((e.code === "Space" || e.code === "Enter") && isAnswered) {
          e.preventDefault(); advance();
        } else if (!isAnswered) {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 6) {
            const btn = optionRefs.current[num - 1];
            if (btn) { e.preventDefault(); btn.click(); }
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, drillPairs, isRecall, revealed, isAnswered, reveal, selfRate, advance]);

  if (drillPairs) {
    return (
      <PairDrill
        pairs={drillPairs}
        onFinish={() => setDrillPairs(null)}
        onClose={onClose}
      />
    );
  }

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
                {progress.extra > 0 && (
                  <span className="ml-1 text-amber-400 dark:text-amber-500">+{progress.extra}</span>
                )}
              </span>
              <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums">✓ {score}</span>
              <span className="text-red-500 dark:text-red-400 font-semibold tabular-nums">✗ {errors}</span>
            </div>
          </>
        )}

        {phase === "finished" && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mx-auto">Session complete</span>
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
                  <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight ${adaptiveFont(currentQuestion.prompt, practiceMaxIndex)}`}>
                    {currentQuestion.prompt}
                  </p>
                  {currentQuestion.sentence &&
                    (currentQuestion.type === TYPES.WORD_MEANING || currentQuestion.type === TYPES.WORD_PRONUNCIATION) && (
                    <>
                      <p className={`mt-5 text-gray-500 dark:text-gray-400 leading-relaxed ${adaptiveFont(currentQuestion.prompt, practiceMaxIndex)}`}>
                        <SentenceWithHighlight sentence={currentQuestion.sentence} word={currentQuestion.word} />
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

            {/* Recall mode — unrevealed */}
            {isRecall && !revealed && (
              <button
                onClick={reveal}
                className="w-full py-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 font-medium text-lg cursor-pointer"
              >
                Tap to reveal
                <span className="ml-2 text-sm opacity-60">Space</span>
              </button>
            )}

            {/* Recall mode — revealed */}
            {isRecall && revealed && (
              <div className="flex flex-col gap-3 w-full">
                <div className="w-full rounded-2xl border-2 border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 px-6 py-5 flex flex-col items-center gap-2 text-center">
                  <div className={`font-bold leading-tight text-gray-900 dark:text-gray-100 ${adaptiveFont(currentQuestion.word, practiceMaxIndex)}`}>
                    {currentQuestion.word}
                  </div>
                  <AudioBtn audioRaw={currentQuestion.audioRaw} />
                  {currentQuestion.pronunciation && (
                    <div className="text-blue-500 dark:text-blue-400 text-2xl font-medium">{currentQuestion.pronunciation}</div>
                  )}
                  {currentQuestion.meaning && (
                    <div className="text-gray-700 dark:text-gray-200 text-xl leading-snug">{currentQuestion.meaning}</div>
                  )}
                  {currentQuestion.sentences?.length > 0 && (
                    <div className="mt-2 text-gray-500 dark:text-gray-400 leading-relaxed border-t border-purple-200 dark:border-purple-800/60 pt-3 w-full flex flex-col gap-2">
                      {currentQuestion.sentences.map((s, i) => (
                        <div key={i} className={adaptiveFont(s, Math.max(0, practiceMaxIndex - 2))}>
                          <SentenceWithHighlight sentence={s} word={currentQuestion.word} />
                        </div>
                      ))}
                      {currentQuestion.sentenceTranslation && (
                        <div className="text-sm text-gray-400 dark:text-gray-500 italic mt-0.5">{currentQuestion.sentenceTranslation}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => selfRate(false)}
                    className="py-4 rounded-2xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold text-base"
                  >
                    ✗ Not yet <span className="ml-2 text-xs opacity-50 font-normal">←</span>
                  </button>
                  <button
                    onClick={() => selfRate(true)}
                    className="py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white transition-colors font-semibold text-base"
                  >
                    ✓ Know it <span className="ml-2 text-xs opacity-70 font-normal">Space</span>
                  </button>
                </div>
              </div>
            )}

            {/* Multiple choice — unanswered */}
            {!isRecall && !isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                <div className="grid grid-cols-2 gap-3 w-full">
                  {currentQuestion.options.map((opt, i) => {
                    const hint =
                      (currentQuestion.type === TYPES.WORD_MEANING || currentQuestion.type === TYPES.MEANING_WORD)
                        ? opt.pronunciation : null;
                    return (
                      <button
                        key={i}
                        ref={(el) => { optionRefs.current[i] = el; }}
                        onClick={() => session.answer(i)}
                        className={optionStyle(i, selected, currentQuestion.correctIndex)}
                      >
                        <span className="absolute top-2 left-2.5 text-xs font-semibold opacity-30 leading-none select-none">
                          {i + 1}
                        </span>
                        <span className={`font-bold leading-tight ${adaptiveFont(optText(opt), practiceMaxIndex)} ${optionTextColor(i, selected, currentQuestion.correctIndex)}`}>
                          {optText(opt)}
                        </span>
                        {hint && <span className="text-sm font-normal leading-tight opacity-50">{hint}</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => session.answer(-1)}
                  className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm font-medium"
                >
                  I don't know
                </button>
              </div>
            )}

            {/* Multiple choice — answered */}
            {!isRecall && isAnswered && (
              <div className="flex flex-col gap-3 w-full">
                <div className={`grid gap-3 w-full ${isWrong ? "grid-cols-2" : "grid-cols-1"}`}>
                  {(() => {
                    const correctOpt = currentQuestion.options[currentQuestion.correctIndex];
                    return (
                      <WordCard
                        {...correctOpt}
                        label={isGaveUp ? "Answer" : "✓ Correct"}
                        variant={isGaveUp ? "reveal" : "correct"}
                        sentences={isWrong
                          ? (correctOpt.sentences ?? currentQuestion.sentences)
                          : reviewSentences}
                        sentenceTranslation={isWrong
                          ? (correctOpt.sentenceTranslation ?? currentQuestion.sentenceTranslation)
                          : reviewSentenceTranslation}
                        audioRaw={currentQuestion.audioRaw}
                        fontMaxIndex={practiceMaxIndex}
                        centered={!isWrong}
                      />
                    );
                  })()}
                  {isWrong && (
                    <WordCard
                      {...currentQuestion.options[selected]}
                      label="✗ You picked"
                      variant="wrong"
                      fontMaxIndex={practiceMaxIndex}
                    />
                  )}
                </div>
                <button
                  onClick={advance}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
                    isCorrect ? "bg-green-600 hover:bg-green-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
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
          <div className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading…</div>
        )}
      </div>
    </div>
  );
};

export default PracticeSession;
