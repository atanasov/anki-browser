#!/usr/bin/env python3
# cspell:ignore ankiconnect notetypes notesinfo
"""
dedup_sentences.py

Removes duplicate notes from the "Mandarin-Sentences" deck.
Uniqueness is determined by the SentenceSimplified field (plain text, HTML stripped).
When duplicates are found the OLDEST note (lowest noteId) is kept; the rest are deleted.

Usage:
  python3 dedup_sentences.py          # dry-run — shows what would be deleted
  python3 dedup_sentences.py --delete # actually delete the duplicates

Requirements:
  - Anki Desktop must be running
  - AnkiConnect add-on installed (code: 2055492159)
"""

import argparse
import json
import re
import sys
import urllib.request
from collections import defaultdict
from html.parser import HTMLParser

# ── Settings ──────────────────────────────────────────────────────────────────

CONNECT_URL   = "http://localhost:8765"
API_KEY       = ""

TARGET_DECK   = "Mandarin-Sentences"
DEDUP_FIELD   = "SentenceSimplified"
BATCH_SIZE    = 500

# ── AnkiConnect helpers ───────────────────────────────────────────────────────

def anki(action: str, **params) -> object:
    body: dict = {"action": action, "version": 6, "params": params}
    if API_KEY:
        body["key"] = API_KEY
    payload = json.dumps(body).encode()
    req = urllib.request.Request(
        CONNECT_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read())
    except Exception as exc:
        print(f"\n[ERROR] Cannot reach AnkiConnect at {CONNECT_URL}: {exc}")
        print("Make sure Anki is running and the AnkiConnect add-on is installed.")
        sys.exit(1)
    if resp.get("error"):
        raise RuntimeError(resp["error"])
    return resp["result"]


def find_notes(query: str) -> list[int]:
    return anki("findNotes", query=query)


def notes_info(ids: list[int]) -> list[dict]:
    return anki("notesInfo", notes=ids) if ids else []


def delete_notes(ids: list[int]) -> None:
    anki("deleteNotes", notes=ids)


# ── HTML → plain text ─────────────────────────────────────────────────────────

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._buf: list[str] = []

    def handle_data(self, data: str):
        self._buf.append(data)

    def plain(self) -> str:
        # Join without spaces so inline tags (<b> etc.) don't split Chinese characters
        return re.sub(r"\s+", " ", "".join(self._buf)).strip()


def plain(html: str) -> str:
    s = _Stripper()
    s.feed(html)
    return s.plain()


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--delete", action="store_true", help="Actually delete duplicates (default: dry-run)")
    args = parser.parse_args()

    dry_run = not args.delete

    print("=== Sentence Deduplicator ===")
    if dry_run:
        print("DRY-RUN mode — pass --delete to actually remove notes\n")
    else:
        print("LIVE mode — duplicates will be permanently deleted\n")

    version = anki("version")
    print(f"AnkiConnect v{version}")
    print(f"Deck  : {TARGET_DECK}")
    print(f"Field : {DEDUP_FIELD}\n")

    # Load all notes
    print("Loading notes...")
    all_ids = find_notes(f'deck:"{TARGET_DECK}"')
    print(f"  {len(all_ids)} note(s) found.\n")

    if not all_ids:
        print("Nothing to do.")
        return

    # Group note IDs by their SentenceSimplified plain-text value
    groups: dict[str, list[int]] = defaultdict(list)  # text → [noteId, ...]

    for batch_start in range(0, len(all_ids), BATCH_SIZE):
        batch = all_ids[batch_start : batch_start + BATCH_SIZE]
        for note in notes_info(batch):
            text = plain(
                (note.get("fields", {}).get(DEDUP_FIELD) or {}).get("value", "")
            )
            if text:
                # Sort by noteId ascending so groups[text][0] is always the oldest
                groups[text].append(note["noteId"])

    # Sort each group so the oldest (lowest ID) comes first
    for text in groups:
        groups[text].sort()

    # Collect IDs to delete (everything after the first in each group)
    to_delete: list[int] = []
    for text, ids in groups.items():
        if len(ids) > 1:
            dupes = ids[1:]
            label = text[:70] + ("…" if len(text) > 70 else "")
            print(f"  [{len(ids)} copies] keep {ids[0]}  delete {dupes}  \"{label}\"")
            to_delete.extend(dupes)

    print(f"\nTotal duplicate notes to delete: {len(to_delete)}")

    if not to_delete:
        print("No duplicates found — deck is clean.")
        return

    if dry_run:
        print("\nDry-run complete. Run with --delete to remove them.")
        return

    print("\nDeleting...")
    # Delete in batches to avoid huge requests
    for batch_start in range(0, len(to_delete), BATCH_SIZE):
        batch = to_delete[batch_start : batch_start + BATCH_SIZE]
        delete_notes(batch)
        print(f"  Deleted {batch_start + len(batch)}/{len(to_delete)}")

    print(f"\n=== Done — {len(to_delete)} duplicate note(s) removed ===")


if __name__ == "__main__":
    main()
