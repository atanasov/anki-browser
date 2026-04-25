import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

// ── Lightbox ─────────────────────────────────────────────────────────────────

const Lightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/30 hover:bg-black/50 rounded-full p-2"
        onClick={onClose}
        aria-label="Close preview"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {alt && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs bg-black/40 rounded-full px-4 py-1.5 pointer-events-none select-none whitespace-nowrap max-w-[80vw] truncate">
          {alt}
        </p>
      )}
    </div>,
    document.body
  );
};

// ── Screenshot thumbnail ──────────────────────────────────────────────────────

const Screenshot = ({ src, alt, caption }) => {
  const [open, setOpen] = useState(false);
  const handleOpen  = useCallback(() => setOpen(true),  []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (!src) return (
    <div className="my-3 flex items-center justify-center h-28 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-400 dark:text-gray-500 italic">
      {alt}
    </div>
  );

  return (
    <>
      <figure className="my-3">
        <button
          type="button"
          onClick={handleOpen}
          className="group relative w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 block"
          aria-label={`Preview: ${alt}`}
        >
          <img src={src} alt={alt} className="w-full h-auto transition-transform duration-200 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 text-white rounded-full p-2.5 shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
                <path strokeLinecap="round" d="M11 8v6M8 11h6" />
              </svg>
            </span>
          </div>
        </button>
        {caption && (
          <figcaption className="mt-1.5 text-center text-xs text-gray-400 dark:text-gray-500 italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {open && <Lightbox src={src} alt={alt} onClose={handleClose} />}
    </>
  );
};

const ScreenshotRow = ({ items }) => (
  <div className="my-3 grid grid-cols-2 gap-3">
    {items.map(({ src, alt, caption }) => (
      <Screenshot key={src} src={src} alt={alt} caption={caption} />
    ))}
  </div>
);

// ── Sidebar nav ───────────────────────────────────────────────────────────────

const NAV = [
  { id: "getting-started",         label: "Getting Started"              },
  { id: "card-browser",            label: "Card Browser"                 },
  { id: "saved-words",             label: "Saved Words"                  },
  { id: "practice-mode",           label: "Practice Mode"                },
  { id: "practice-results",        label: "Practice Results & Weak Words"},
  { id: "similar-words",           label: "Similar Words"                },
  { id: "example-sentences",       label: "Example Sentences"            },
  { id: "edit-mode",               label: "Edit Mode"                    },
  { id: "display-settings",        label: "Display & Settings"           },
];

const SidebarNav = ({ activeId }) => (
  <nav aria-label="Help sections" className="space-y-0.5">
    {NAV.map(({ id, label }) => (
      <a
        key={id}
        href={`#${id}`}
        className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
          activeId === id
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        {label}
      </a>
    ))}
  </nav>
);

// ── Section ───────────────────────────────────────────────────────────────────

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-20">
    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {title}
    </h2>
    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
      {children}
    </div>
  </section>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const HelpPage = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(NAV[0].id);
  const observerRef = useRef(null);

  useEffect(() => {
    const sections = NAV.map(({ id }) => document.getElementById(id)).filter(Boolean);
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
          setActiveId(top.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help</h1>
      </div>

      <div className="flex gap-10">

        {/* Sidebar */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-20">
            <SidebarNav activeId={activeId} />
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12">

          <Section id="getting-started" title="Getting Started">
            <p>Before using Anki Browser, make sure <strong>Anki Desktop</strong> is open and the <strong>AnkiConnect</strong> add-on is installed and running.</p>
            <Screenshot src="/screenshots/help-anki-desktop.png" alt="Anki Desktop with AnkiConnect running" />
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Open Anki Browser in your browser (or install it as a PWA).</li>
              <li>Click <strong>+ New View</strong> in the top bar to create your first view.</li>
              <li>Pick a deck and note type, then choose which fields appear on the front and back of each card.</li>
              <li>Save — your cards load in the grid.</li>
            </ol>
            <Screenshot src="/screenshots/help-create-view.png" alt="Create View modal — picking deck and fields" />
          </Section>

          <Section id="card-browser" title="Card Browser">
            <p>Cards display in a responsive grid. Click any card to flip between front and back. Images are shown as full card backgrounds; audio plays on hover.</p>
            <Screenshot src="/screenshots/help-card-browser.png" alt="Card browser grid" />
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Search bar</strong> — quick text filter across visible cards.</li>
              <li><strong>Filters</strong> — the Filters dropdown groups all temporary filters: flag colour, card status (new / learning / review), tags, saved words, and weak cards.</li>
              <li><strong>Marked / Leech</strong> — quick toggles inside Filters to show only marked or leech cards.</li>
              <li><strong>Weak cards</strong> — appears inside Filters when cards carry <code>weak::</code> tags (set automatically during practice); narrows the grid to those cards only.</li>
              <li><strong>Card buttons</strong> — hover a card to reveal three round buttons: orange (example sentences), purple (similar words), blue (card info).</li>
            </ul>
            <Screenshot src="/screenshots/help-filters.png" alt="Filters dropdown open" caption="Filters dropdown — flag, status, tags, saved words" />
            <Screenshot src="/screenshots/help-card-info.png" alt="Card info panel — fields, tags, and note details" caption="Card info panel showing all fields and tags" />
          </Section>

          <Section id="saved-words" title="Saved Words (Bookmark)">
            <p>The <strong>bookmark icon</strong> in the top bar opens the Saved Words panel — a personal word list you build while browsing or practising.</p>
            <Screenshot src="/screenshots/help-saved-words.png" alt="Saved words panel open" caption="Saved words panel with word list and status dots" />
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Add manually</strong> — type a word in the input and press Enter.</li>
              <li><strong>Save during practice</strong> — select any text shown on a practice card (including words inside example sentences or translations) and press <kbd>S</kbd>. Useful for picking up vocabulary that appears in sentence exercises but isn't the card's main word.</li>
              <li><strong>Personal note</strong> — click a word row to add a short note (saved automatically).</li>
              <li><strong>Search →</strong> — hover a row and click to jump to that word in the card browser.</li>
              <li><strong>Status dots</strong> — green: word found in Anki; red: not found.</li>
              <li><strong>Filter</strong> — use Filters → Saved Words to narrow the card browser to cards that contain any of your saved words. Combine with the Weak filter to focus on weak cards that match your word list.</li>
            </ul>
          </Section>

          <Section id="practice-mode" title="Practice Mode">
            <p>Click <strong>▶ Practice</strong> to enter selection mode, click the cards you want (or <strong>Select All</strong>), then hit <strong>▶ Start Practice</strong>.</p>
            <Screenshot src="/screenshots/help-practice-selection.png" alt="Practice selection mode" caption="Practice selection — click cards or Select All" />

            <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">Setup dialog</p>
            <p>Choose exercise types, toggle similar-word expansion, and decide whether to add confused words to the pool.</p>
            <Screenshot src="/screenshots/help-practice-setup.png" alt="Practice setup modal" caption="Practice setup — exercise types and options" />

            <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">Exercise types</p>
            <p>Each type tests a different direction of recall. Click any screenshot to zoom.</p>

            <ScreenshotRow items={[
              { src: "/screenshots/help-exercise-word-meaning.png",       alt: "Word → Meaning",              caption: "Word → Meaning" },
              { src: "/screenshots/help-exercise-meaning-word.png",       alt: "Meaning → Word",              caption: "Meaning → Word" },
            ]} />
            <ScreenshotRow items={[
              { src: "/screenshots/help-exercise-word-pronunciation.png", alt: "Word → Pronunciation",        caption: "Word → Pronunciation" },
              { src: "/screenshots/help-exercise-pronunciation-word.png", alt: "Pronunciation → Word",        caption: "Pronunciation → Word" },
            ]} />
            <ScreenshotRow items={[
              { src: "/screenshots/help-exercise-sentence-cloze.png",     alt: "Sentence → Word (fill blank)", caption: "Sentence → Word (fill blank)" },
              { src: "/screenshots/help-exercise-type-meaning.png",       alt: "Word → Translation (type)",   caption: "Word → Translation (type)" },
            ]} />
            <ScreenshotRow items={[
              { src: "/screenshots/help-exercise-type-word.png",              alt: "Translation → Word (type)",      caption: "Translation → Word (type)" },
              { src: "/screenshots/help-exercise-sentence-translation.png",   alt: "Sentence → Translation (type)",  caption: "Sentence → Translation (type)" },
            ]} />
            <Screenshot src="/screenshots/help-exercise-dictation.png" alt="Dictation — listen and type" caption="Dictation — listen and type what you hear" />

            <p className="mt-1">During a session, each wrong answer tags the card in Anki with <code>weak::</code> automatically. Correct streaks clear the tag.</p>
            <p>Press <kbd>S</kbd> at any time to save the currently selected text to your Saved Words list — handy for words you spot in example sentences or translations that you want to review later.</p>
          </Section>

          <Section id="practice-results" title="Practice Results & Weak Words">
            <p>When all questions are answered, the end screen shows your score, a missed-words list, and a confusion report of pairs you mixed up.</p>
            <Screenshot src="/screenshots/help-practice-results.png" alt="End-of-session results screen" caption="Results — score, missed words, confusion pairs" />
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Retry weak words</strong> — restarts with only the cards you got wrong.</li>
              <li><strong>Pair Drill</strong> — focused side-by-side drill on the confused pairs.</li>
              <li>Card <strong>flags</strong> are written to Anki automatically: 🔴 red = high weakness, 🟠 orange = medium, cleared = none.</li>
            </ul>
          </Section>

          <Section id="similar-words" title="Similar Words">
            <p>Hover a card and click the <strong>purple link button</strong> to open Similar Words. It searches your deck for cards that share characters with the current word, grouped by shared character in columns.</p>
            <Screenshot src="/screenshots/help-similar-words.png" alt="Similar Words popup" caption="Similar Words — grouped by shared character" />
            <p>Use the <strong>Studied only</strong> toggle (default on) to limit results to cards already in review or learning.</p>
          </Section>

          <Section id="example-sentences" title="Example Sentences">
            <p>Hover a card and click the <strong>orange book button</strong> to open Example Sentences. It queries a configured deck for sentences that contain the current word, showing sentence, pronunciation, meaning, and any audio or image.</p>
            <Screenshot src="/screenshots/help-example-sentences.png" alt="Example Sentences popup" caption="Example Sentences with audio and meaning" />
            <p>Configure which deck to search in <strong>Settings → Example sentences deck</strong>.</p>
          </Section>

          <Section id="edit-mode" title="Edit Mode (Bulk Editing)">
            <p>Click <strong>✎ Edit</strong> in the top bar to enter edit mode. Select cards by clicking them; a toolbar appears at the bottom.</p>
            <Screenshot src="/screenshots/help-edit-mode.png" alt="Edit mode with cards selected and toolbar visible" caption="Edit mode — selected cards highlighted, bulk toolbar at bottom" />
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Add tag</strong> — adds a tag to all selected cards in Anki.</li>
              <li><strong>Remove tag</strong> — removes a tag from all selected cards.</li>
              <li><strong>Suspend / Unsuspend</strong> — toggles card suspension in Anki.</li>
            </ul>
          </Section>

          <Section id="display-settings" title="Display & Settings">
            <p>Open the <strong>Settings</strong> menu (gear icon, top-right) to adjust display and connection options.</p>
            <Screenshot src="/screenshots/help-settings.png" alt="Settings panel open" caption="Settings — scale, card size, theme, AnkiConnect" />
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>UI Scale</strong> — zooms the entire interface (85 %–135 %).</li>
              <li><strong>Card size & aspect ratio</strong> — Small / Medium / Large grid; Square / Portrait / Landscape.</li>
              <li><strong>Card font size</strong> — per-view font size, or <em>Fit to card</em> auto-sizing.</li>
              <li><strong>Practice Q&A size</strong> — font size for practice prompts and answers.</li>
              <li><strong>Theme</strong> — Light / Dark / System (follows OS preference).</li>
              <li><strong>AnkiConnect URL & token</strong> — change if Anki runs on a different host or requires auth.</li>
              <li><strong>Media cache duration</strong> — how long images and audio are cached locally (default 24 h).</li>
              <li><strong>Import / Export</strong> — back up or restore all views and settings as JSON.</li>
            </ul>
          </Section>

        </div>
      </div>
    </div>
  );
};

export default HelpPage;
