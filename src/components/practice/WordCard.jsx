/**
 * WordCard
 * Unified card component replacing ReviewCard + WordProfileCard.
 * Displays word / pronunciation / meaning / sentences with variant coloring.
 */

import { adaptiveFont } from "./practiceUtils";
import { SentenceWithHighlight } from "./SentenceHighlight";
import AudioBtn from "./AudioBtn";

const VARIANTS = {
  neutral: {
    border:  "border-gray-200 dark:border-gray-700",
    bg:      "bg-white dark:bg-gray-800",
    label:   "text-gray-400 dark:text-gray-500",
    word:    "text-gray-900 dark:text-gray-100",
    divider: "border-gray-100 dark:border-gray-700",
  },
  correct: {
    border:  "border-green-400 dark:border-green-500",
    bg:      "bg-green-50 dark:bg-green-900/25",
    label:   "text-green-600 dark:text-green-400",
    word:    "text-gray-900 dark:text-gray-100",
    divider: "border-green-200 dark:border-green-800/60",
  },
  reveal: {
    border:  "border-green-400 dark:border-green-500",
    bg:      "bg-green-50 dark:bg-green-900/25",
    label:   "text-green-600 dark:text-green-400",
    word:    "text-gray-900 dark:text-gray-100",
    divider: "border-green-200 dark:border-green-800/60",
  },
  wrong: {
    border:  "border-red-400 dark:border-red-500",
    bg:      "bg-red-50 dark:bg-red-900/25",
    label:   "text-red-500 dark:text-red-400",
    word:    "text-red-900 dark:text-red-100",
    divider: "border-red-200 dark:border-red-800/60",
  },
};

const WordCard = ({
  word, pronunciation, meaning,
  sentences, sentenceTranslation,
  label, variant = "neutral",
  audioRaw, centered = false,
  fontMaxIndex = 4,
}) => {
  const v = VARIANTS[variant] ?? VARIANTS.neutral;
  const align = centered ? "items-center text-center" : "items-start";

  return (
    <div className={`flex-1 w-full rounded-2xl border-2 px-5 py-4 flex flex-col gap-1.5 ${v.border} ${v.bg}`}>
      <div className={`flex ${centered ? "justify-center" : "justify-between"} items-center`}>
        {label && (
          <span className={`text-xs font-bold uppercase tracking-widest ${v.label}`}>{label}</span>
        )}
        {audioRaw && !centered && <AudioBtn audioRaw={audioRaw} />}
      </div>

      <div className={`flex flex-col gap-1.5 ${align}`}>
        {word && (
          <div className={`font-bold leading-tight ${v.word} ${adaptiveFont(word, fontMaxIndex)}`}>
            {word}
          </div>
        )}
        {audioRaw && centered && <AudioBtn audioRaw={audioRaw} />}
        {pronunciation && (
          <div className="text-blue-500 dark:text-blue-400 text-xl font-medium">{pronunciation}</div>
        )}
        {meaning && (
          <div className="text-gray-700 dark:text-gray-200 text-lg leading-snug">{meaning}</div>
        )}
      </div>

      {sentences?.length > 0 && (
        <div className={`mt-1 text-gray-500 dark:text-gray-400 leading-relaxed border-t ${v.divider} pt-3 flex flex-col gap-2 ${centered ? "text-center" : ""}`}>
          {sentences.map((s, i) => (
            <div key={i} className={adaptiveFont(s, Math.max(0, fontMaxIndex - 2))}>
              <SentenceWithHighlight sentence={s} word={word} />
            </div>
          ))}
          {sentenceTranslation && (
            <div className="text-sm text-gray-400 dark:text-gray-500 italic mt-0.5">
              {sentenceTranslation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordCard;
