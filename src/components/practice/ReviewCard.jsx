import { adaptiveFont } from "./practiceUtils";
import { SentenceWithHighlight } from "./SentenceHighlight";
import AudioBtn from "./AudioBtn";

const ReviewCard = ({ option, variant, sentences, sentenceTranslation, audioRaw, fontMaxIndex, centered }) => {
  const isCorrect = variant === "correct";
  const isReveal  = variant === "reveal";
  const baseClass = (isCorrect || isReveal)
    ? "border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/25"
    : "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/25";
  const labelClass = (isCorrect || isReveal) ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400";
  const wordClass  = (isCorrect || isReveal) ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100";
  const dividerClass = (isCorrect || isReveal)
    ? "border-green-200 dark:border-green-800/60"
    : "border-red-200 dark:border-red-800/60";
  const align = centered ? "items-center text-center" : "items-start";
  const label = isCorrect ? "✓ Correct" : isReveal ? "Answer" : "✗ You picked";

  return (
    <div className={`w-full rounded-2xl border-2 px-6 py-5 flex flex-col gap-2 ${baseClass}`}>
      <div className={`flex ${centered ? "justify-center" : "justify-between"} items-center`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${labelClass}`}>
          {label}
        </span>
        {(isCorrect || isReveal) && !centered && <AudioBtn audioRaw={audioRaw} />}
      </div>

      <div className={`flex flex-col gap-1.5 ${align}`}>
        {option.word && (
          <div className={`font-bold leading-tight ${wordClass} ${adaptiveFont(option.word, fontMaxIndex ?? 4)}`}>
            {option.word}
          </div>
        )}
        {(isCorrect || isReveal) && centered && <AudioBtn audioRaw={audioRaw} />}
        {option.pronunciation && (
          <div className="text-blue-500 dark:text-blue-400 text-xl font-medium">{option.pronunciation}</div>
        )}
        {option.meaning && (
          <div className="text-gray-700 dark:text-gray-200 text-lg leading-snug">{option.meaning}</div>
        )}
      </div>

      {sentences?.length > 0 && (
        <div className={`mt-1 text-gray-500 dark:text-gray-400 leading-relaxed border-t ${dividerClass} pt-3 flex flex-col gap-2 ${centered ? "text-center" : ""}`}>
          {sentences.map((s, i) => (
            <div key={i} className={adaptiveFont(s, Math.max(0, (fontMaxIndex ?? 4) - 2))}>
              <SentenceWithHighlight sentence={s} word={option.word} />
            </div>
          ))}
          {sentenceTranslation && (
            <div className="text-sm text-gray-400 dark:text-gray-500 italic mt-0.5">{sentenceTranslation}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
