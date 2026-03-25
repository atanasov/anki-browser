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
  const [drillPairs,    setDrillPairs]    = useState(null);
  const [inputText,     setInputText]     = useState("");
  const [submittedText, setSubmittedText] = useState("");

  const doStart = useCallback((weakNoteIds = null) => {
    if (!sessionOptions) return;
    const baseNotes = weakNoteIds
      ? sessionOptions.pool.filter((n) => weakNoteIds.includes(n.noteId))
      : sessionOptions.baseNotes;
    session.start(baseNotes, sessionOptions.pool, sessionOptions.exerciseType, sessionOptions.view, sessionOptions.addConfused, sessionOptions.sentenceMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionOptions]); // session.start is stable (useCallback with no deps)

  useEffect(() => { doStart(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { phase, current: questionIndex, currentQuestion, selected, revealed, progress, score, errors, confusionReport, tagSummary, advance, reveal, selfRate } = session;

  const [showTranslation, setShowTranslation] = useState(false);
  useEffect(() => {
    setShowTranslation(false);
    setInputText("");
    setSubmittedText("");
  }, [questionIndex]);

  const isTyping      = currentQuestion?.type === TYPES.TYPE_MEANING || currentQuestion?.type === TYPES.TYPE_WORD;
  const isSentenceMode = currentQuestion?.type === TYPES.SENTENCE_TRANSLATION || currentQuestion?.type === TYPES.SENTENCE_DICTATION;
  const isSelfRate    = isTyping || isSentenceMode; // modes that use type→reveal→self-rate flow
  const isGaveUp   = selected === -1;
  const isAnswered = selected !== null;
  const isWrong    = !isSelfRate && isAnswered && !isGaveUp && selected !== currentQuestion?.correctIndex;
  const isCorrect  = !isSelfRate && isAnswered && !isGaveUp && selected === currentQuestion?.correctIndex;

  // SENTENCE_CLOZE intentionally excluded: the cloze shows [___], after answer we want the completed sentence
  const sentenceAlreadyShown =
    currentQuestion?.type === TYPES.WORD_MEANING ||
    currentQuestion?.type === TYPES.WORD_PRONUNCIATION;
  const reviewSentences           = sentenceAlreadyShown ? [] : (currentQuestion?.sentences ?? []);
  const reviewSentenceTranslation = sentenceAlreadyShown ? "" : (currentQuestion?.sentenceTranslation ?? "");

  // Auto-play audio on multiple-choice answer reveal
  useEffect(() => {
    if (!isSelfRate && isAnswered && currentQuestion?.audioRaw) playAudio(currentQuestion.audioRaw);
  }, [isSelfRate, isAnswered, currentQuestion?.audioRaw]);

  // Auto-play audio when answer is revealed (all self-rate modes)
  useEffect(() => {
    if (isSelfRate && revealed && currentQuestion?.audioRaw)
      playAudio(currentQuestion.audioRaw);
  }, [isSelfRate, revealed, currentQuestion?.audioRaw]);

  // Auto-play dictation audio when question loads
  useEffect(() => {
    if (currentQuestion?.type === TYPES.SENTENCE_DICTATION && currentQuestion?.audioRaw)
      playAudio(currentQuestion.audioRaw);
  }, [questionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionRefs = useRef([]);

  // Blur any focused element behind the overlay so it can't swallow keyboard events
  useEffect(() => { document.activeElement?.blur(); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "playing" || drillPairs) return;
    const onKey = (e) => {
      const inInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

      // R — replay audio (any point, blocked when typing in input)
      if ((e.key === "r" || e.key === "R") && !inInput && currentQuestion?.audioRaw) {
        e.preventDefault(); playAudio(currentQuestion.audioRaw); return;
      }

      if (isSelfRate) {
        if (revealed) {
          if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") { e.preventDefault(); selfRate(true); }
          else if (e.code === "ArrowLeft") { e.preventDefault(); selfRate(false); }
        } else {
          // Escape — skip without typing
          if (e.code === "Escape") { e.preventDefault(); selfRate(false); }
          // Enter handled by input's onKeyDown
        }
      } else {
        if ((e.code === "Space" || e.code === "Enter") && isAnswered) {
          e.preventDefault(); advance();
        } else if (!isAnswered) {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 6) {
            const btn = optionRefs.current[num - 1];
            if (btn) { e.preventDefault(); btn.click(); }
          } else if (e.key === "0") {
            e.preventDefault(); session.answer(-1);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, drillPairs, isSelfRate, revealed, isAnswered, selfRate, advance, session, currentQuestion]);

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
              ) : currentQuestion.type === TYPES.SENTENCE_DICTATION ? (
                /* Dictation — audio only, no text */
                <div className="flex flex-col items-center gap-3 py-4">
                  <AudioBtn audioRaw={currentQuestion.audioRaw} />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Listen and type what you hear
                    <span className="ml-2 opacity-60">({currentQuestion.word})</span>
                    <span className="ml-3 opacity-40">R to replay</span>
                  </p>
                </div>
              ) : currentQuestion.type === TYPES.SENTENCE_TRANSLATION ? (
                /* Sentence translation — show sentence + audio */
                <div className="flex flex-col items-center gap-3">
                  <p className={`text-gray-900 dark:text-gray-100 leading-relaxed text-center ${adaptiveFont(currentQuestion.prompt, Math.max(1, practiceMaxIndex - 1))}`}>
                    <SentenceWithHighlight sentence={currentQuestion.prompt} word={currentQuestion.word} />
                  </p>
                  {currentQuestion.audioRaw && (
                    <div className="flex items-center gap-2">
                      <AudioBtn audioRaw={currentQuestion.audioRaw} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 opacity-40">R</span>
                    </div>
                  )}
                </div>
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

            {/* Self-rate exercise — input */}
            {isSelfRate && !revealed && (
              <div className="flex flex-col gap-3 w-full">
                <input
                  autoFocus
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.code === "Enter") {
                      e.stopPropagation();
                      const text = inputText.trim();
                      if (text) { setSubmittedText(text); reveal(); setInputText(""); }
                    }
                  }}
                  placeholder="Type your answer…"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={() => { const text = inputText.trim(); if (text) { setSubmittedText(text); reveal(); setInputText(""); } }}
                  disabled={!inputText.trim()}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-colors"
                >
                  Check <span className="ml-2 text-xs opacity-60 font-normal">Enter</span>
                </button>
                <button
                  onClick={() => selfRate(false)}
                  className="w-full py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm font-medium"
                >
                  Skip / I don't know <span className="ml-1 text-xs opacity-40 font-normal">Esc</span>
                </button>
              </div>
            )}

            {/* Self-rate exercise — revealed: compare + self-rate */}
            {isSelfRate && revealed && (
              <div className="flex flex-col gap-3 w-full">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">You typed</span>
                    <p className={`font-bold text-gray-800 dark:text-gray-200 leading-tight text-center ${adaptiveFont(submittedText, practiceMaxIndex)}`}>{submittedText}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 px-5 py-4 flex flex-col items-center gap-1">
                    <span className="text-xs text-purple-500 dark:text-purple-400 uppercase tracking-widest">Answer</span>
                    <p className={`font-bold text-gray-900 dark:text-gray-100 leading-tight text-center ${adaptiveFont(currentQuestion.answer, practiceMaxIndex)}`}>{currentQuestion.answer}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => selfRate(false)}
                    className="py-4 rounded-2xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold text-base"
                  >
                    ✗ Wrong <span className="ml-2 text-xs opacity-50 font-normal">←</span>
                  </button>
                  <button
                    onClick={() => selfRate(true)}
                    className="py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white transition-colors font-semibold text-base"
                  >
                    ✓ Correct <span className="ml-2 text-xs opacity-70 font-normal">Space</span>
                  </button>
                </div>
              </div>
            )}

            {/* Multiple choice — unanswered */}
            {!isSelfRate && !isAnswered && (
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
                        {hint && <span className="text-sm font-normal leading-tight opacity-50 dark:opacity-40 dark:text-gray-400">{hint}</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => session.answer(-1)}
                  className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm font-medium"
                >
                  I don't know <span className="ml-1 text-xs opacity-40 font-normal">0</span>
                </button>
              </div>
            )}

            {/* Multiple choice — answered */}
            {!isSelfRate && isAnswered && (
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
            tagSummary={tagSummary}
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
