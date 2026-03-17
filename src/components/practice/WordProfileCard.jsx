import { adaptiveFont } from "./practiceUtils";
import { SentenceWithHighlight } from "./SentenceHighlight";

const VARIANTS = {
  neutral: {
    border:  "border-gray-200 dark:border-gray-700",
    bg:      "bg-white dark:bg-gray-800",
    label:   "text-gray-400 dark:text-gray-500",
    divider: "border-gray-100 dark:border-gray-700",
  },
  correct: {
    border:  "border-green-400 dark:border-green-500",
    bg:      "bg-green-50 dark:bg-green-900/25",
    label:   "text-green-600 dark:text-green-400",
    divider: "border-green-200 dark:border-green-800/60",
  },
  wrong: {
    border:  "border-red-400 dark:border-red-500",
    bg:      "bg-red-50 dark:bg-red-900/25",
    label:   "text-red-500 dark:text-red-400",
    divider: "border-red-200 dark:border-red-800/60",
  },
};

const WordProfileCard = ({ word, pronunciation, meaning, sentences, sentenceTranslation, label, variant = "neutral", fontMaxIndex = 4 }) => {
  const v = VARIANTS[variant] ?? VARIANTS.neutral;
  return (
    <div className={`flex-1 rounded-2xl border-2 px-5 py-4 flex flex-col gap-1.5 ${v.border} ${v.bg}`}>
      {label && (
        <span className={`text-xs font-bold uppercase tracking-widest ${v.label}`}>{label}</span>
      )}
      {word && (
        <div className={`font-bold text-gray-900 dark:text-gray-100 leading-tight ${adaptiveFont(word, fontMaxIndex)}`}>
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
        <div className={`mt-1 text-gray-500 dark:text-gray-400 leading-relaxed border-t ${v.divider} pt-2 flex flex-col gap-1.5`}>
          {sentences.map((s, i) => (
            <div key={i} className={adaptiveFont(s, Math.max(0, fontMaxIndex - 2))}>
              <SentenceWithHighlight sentence={s} word={word} />
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

export default WordProfileCard;
