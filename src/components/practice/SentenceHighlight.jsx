// Sentence with the target word highlighted in orange.
export const SentenceWithHighlight = ({ sentence, word }) => {
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

// Sentence cloze prompt: renders the gap as a styled placeholder.
export const ClozePrompt = ({ prompt }) => {
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
