import { useState } from "react";
import WordProfileCard from "./WordProfileCard";

const EndScreen = ({ report, onRestart, onDrillPairs, onClose }) => {
  const [weakOnly, setWeakOnly] = useState(false);

  const pct = report.total > 0 ? Math.round((report.score / report.total) * 100) : 0;
  const scoreColor =
    pct >= 80 ? "text-green-600 dark:text-green-400" :
    pct >= 50 ? "text-amber-500 dark:text-amber-400" :
                "text-red-600 dark:text-red-400";

  const handleRestart = () => {
    onRestart(weakOnly ? report.confusedWords.map((w) => w.noteId) : null);
  };

  return (
    <div className="flex flex-col items-center justify-start h-full overflow-y-auto px-6 py-10 gap-8 max-w-2xl mx-auto w-full">
      {/* Score */}
      <div className="text-center">
        <div className={`text-7xl font-bold tabular-nums ${scoreColor}`}>{pct}%</div>
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
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{w.word}</span>
                  <span className="text-sm text-red-500 dark:text-red-400 font-semibold shrink-0 mt-1">{w.errors}✗</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                  {w.pronunciation && <span className="text-base text-blue-600 dark:text-blue-400">{w.pronunciation}</span>}
                  {w.meaning && <span className="text-base text-green-700 dark:text-green-400">{w.meaning}</span>}
                </div>
                {w.wrongPicks.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {w.wrongPicks.map((pick, j) => (
                      <div key={j} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs text-red-400 dark:text-red-500 shrink-0">picked</span>
                          <span className="text-xl font-bold text-red-700 dark:text-red-300 leading-tight">{pick.text}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-0.5">
                          {pick.pronunciation && <span className="text-sm text-blue-600 dark:text-blue-400">{pick.pronunciation}</span>}
                          {pick.meaning && <span className="text-sm text-gray-600 dark:text-gray-400">{pick.meaning}</span>}
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
              <div key={char} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

export default EndScreen;
