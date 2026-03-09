<div align="center">
  <img src="public/favicon.svg" alt="Anki Browser Logo" width="120" height="120">

# Anki Browser

**Browse and study your Anki cards in a beautiful web interface**

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-teal.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What is Anki Browser?

A client-only PWA that connects to your local Anki Desktop and lets you browse your flashcards in a visual grid — with flip-to-reveal, image backgrounds, audio playback, and bulk editing. No server required.

> **Requires:** Anki Desktop with the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on running locally.

## Features

### Card Browser
- **Visual grid** — Browse all your Anki cards in a responsive grid with flip-to-reveal front/back sides
- **Views** — Saved configurations per deck/note type with custom front and back fields
- **Hover to flip** — Click any card to flip between front and back with smooth transitions
- **Image & Audio** — Display card images as full card backgrounds; play audio on hover
- **Advanced Queries** — Filter cards with full Anki search syntax (tags, due dates, flags, etc.)
- **Bulk Edit** — Select multiple cards and add/remove tags or suspend them via AnkiConnect

### Practice Mode
- **Flashcard** — Classic flip-to-reveal practice
- **Multiple choice** — 6-option quiz generated from your deck
- **Word → Meaning, Word → Pronunciation, Pronunciation → Word** — targeted drill types
- **Sentence cloze** — Fill-in-the-blank from example sentences
- **Confusion report** — End-of-session summary of missed words with wrong picks highlighted
- **Weak-words retry** — Practice only the words you got wrong in the previous session

### Similar Words Popup
- Shows cards from your deck that share characters with the current word, grouped by character in columns
- Large, readable text — word, pronunciation, and meaning on one compact line per entry
- **Studied only** filter (on by default) — limits results to cards you have already reviewed

### Example Sentences Popup
- Searches a configured deck for sentences containing the current card's word
- Displays sentence, pronunciation, meaning, image, and audio playback per result
- Large text optimised for desktop reading

### Display & Accessibility
- **UI Scale** — Global zoom control (85 % – 135 %) that scales the entire interface at once; menus, popups, labels, and buttons all adjust together
- **Practice Q&A Size** — Independent font size control (S / M / L / XL / 2XL) for practice prompts and answer options
- **Card font size** — Per-view font size for card front/back content (S → 5XL) with optional *Fit to card* auto-sizing
- **Card size & aspect ratio** — Small / Medium / Large grid and Square / Portrait / Landscape card shape
- **Dark / Light / System theme** — Follows system preference or set manually; applied before first render to prevent flash

### Data & Settings
- **Import / Export** — Backup and restore all views and settings as JSON; merge or overwrite
- **PWA** — Installable as a desktop app, works offline for browsing cached cards
- **Media cache** — Images and audio cached locally with configurable TTL (default 24 h)

---

## Quick Start

### Prerequisites

- Node.js 18+
- Anki Desktop with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed

### Run locally

```bash
git clone https://github.com/atanasov/anki-games.git
cd anki-games
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Make sure Anki is running first.

## How it works

1. **Create a View** — Pick a deck and note type, choose which fields appear on the front and back of cards
2. **Browse** — All matching cards load in a responsive grid; click to flip, click the card info button for details
3. **Filter** — Use the search bar for quick text search, or open Advanced Query for full Anki syntax
4. **Explore** — Open the Similar Words or Example Sentences popup from any card to see related content
5. **Practice** — Start a practice session from any view; choose the exercise type and number of cards
6. **Edit** — Enable Edit Mode to select cards and bulk-edit tags or suspend them

## Tech Stack

|                   |                                    |
| ----------------- | ---------------------------------- |
| **React 19**      | UI with hooks                      |
| **Vite 7**        | Build tool                         |
| **TailwindCSS 4** | Styling                            |
| **Zustand**       | State management                   |
| **AnkiConnect**   | API to Anki Desktop                |
| **DOMPurify**     | HTML sanitization for card content |

All data is stored in `localStorage` — no accounts, no server, no tracking.

## Build & Deploy

```bash
npm run build    # output → dist/
npm run preview  # preview at http://localhost:4173/
```

The app is deployed to [Netlify](https://anki-games.netlify.app/) on every push to `master`. The `netlify.toml` in the repo root configures the build command and SPA redirect rules automatically.

## Settings

| Setting                | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| AnkiConnect URL        | Default `http://localhost:8765`                                       |
| AnkiConnect Token      | Optional, if you set a token in AnkiConnect                           |
| Media cache duration   | How long to cache images/audio (default 24 hours)                     |
| UI Scale               | Global interface zoom: 85% / 90% / 100% / 110% / 120% / 135%         |
| Practice Q&A Size      | Font size for practice prompts and answers: S / M / L / XL / 2XL     |
| Card size              | Small / Medium / Large grid                                           |
| Aspect ratio           | Square / Portrait / Landscape                                         |
| Card font size         | S / M / L / XL / 2XL / 3XL / 4XL / 5XL, or *Fit to card* auto-size  |

## Contributing

Issues and pull requests welcome. See [CLAUDE.md](CLAUDE.md) for architecture notes.

## License

MIT — see [LICENSE](LICENSE)

## Credits

- [AnkiConnect](https://foosoft.net/projects/anki-connect/) by FooSoft
- Built with [React](https://react.dev/), [Vite](https://vitejs.dev/), and [TailwindCSS](https://tailwindcss.com/)

---

<div align="center">
  Made with ❤️ for language learners
</div>
