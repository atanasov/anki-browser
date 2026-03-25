#!/usr/bin/env python3
# cspell:ignore ankiconnect notetypes notesinfo
"""
sync_key_field.py

Updates the Key field of every note in "Mandarin-Sentences" to match
the plain-text value of SentenceSimplified.

Also detects duplicate SentenceSimplified values — duplicates are reported
and skipped (the oldest note keeps its key; newer copies are listed for review).

Usage:
  python3 sync_key_field.py           # dry-run — shows what would change
  python3 sync_key_field.py --update  # apply changes

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

CONNECT_URL  = "http://localhost:8765"
API_KEY      = ""

TARGET_DECK  = "Mandarin-Sentences"
KEY_FIELD    = "Key"
SOURCE_FIELD = "SentenceSimplified"
BATCH_SIZE   = 500

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
        with urllib.request.urlopen(req, timeout=30) as r:
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


# ── HTML → plain text ─────────────────────────────────────────────────────────

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._buf: list[str] = []

    def handle_data(self, data: str):
        self._buf.append(data)

    def plain(self) -> str:
        # Join without spaces so Chinese characters aren't split by inline tags
        return re.sub(r"\s+", " ", "".join(self._buf)).strip()


def plain(html: str) -> str:
    s = _Stripper()
    s.feed(html)
    return s.plain()


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--update", action="store_true",
        help="Apply changes (default: dry-run)"
    )
    args = parser.parse_args()
    dry_run = not args.update

    print("=== Key Field Sync ===")
    if dry_run:
        print("DRY-RUN — pass --update to apply changes\n")
    else:
        print("LIVE — changes will be written to Anki\n")

    version = anki("version")
    print(f"AnkiConnect v{version}")
    print(f"Deck   : {TARGET_DECK}")
    print(f"Update : {SOURCE_FIELD}  →  {KEY_FIELD}\n")

    # ── Load all notes ────────────────────────────────────────────────────────
    print("Loading notes...")
    all_ids = find_notes(f'deck:"{TARGET_DECK}"')
    print(f"  {len(all_ids)} note(s) found.\n")

    if not all_ids:
        print("Nothing to do.")
        return

    # ── Collect field values, detect duplicates ───────────────────────────────
    # Map plain-text SentenceSimplified → list of (noteId, current_key, raw_ss)
    # sorted by noteId ascending so index 0 is always the oldest
    groups: dict[str, list[tuple]] = defaultdict(list)

    for i in range(0, len(all_ids), BATCH_SIZE):
        for note in notes_info(all_ids[i : i + BATCH_SIZE]):
            note_id  = note["noteId"]
            cur_key  = (note["fields"].get(KEY_FIELD) or {}).get("value", "")
            raw_ss   = (note["fields"].get(SOURCE_FIELD) or {}).get("value", "")
            text     = plain(raw_ss)
            if text:
                groups[text].append((note_id, cur_key, text))

    for text in groups:
        groups[text].sort(key=lambda x: x[0])  # oldest first

    # ── Analyse ───────────────────────────────────────────────────────────────
    to_update:    list[tuple[int, str]] = []   # (noteId, new_key)
    already_ok:   int = 0
    dupe_groups:  dict[str, list[tuple]] = {}
    dupe_skipped: int = 0

    for text, entries in groups.items():
        if len(entries) > 1:
            dupe_groups[text] = entries
            dupe_skipped += len(entries) - 1   # keep oldest, skip rest
            # Still update the oldest if its Key is wrong
            oldest_id, oldest_key, _ = entries[0]
            if oldest_key != text:
                to_update.append((oldest_id, text))
            else:
                already_ok += 1
        else:
            note_id, cur_key, text = entries[0]
            if cur_key != text:
                to_update.append((note_id, text))
            else:
                already_ok += 1

    # ── Report duplicates ─────────────────────────────────────────────────────
    if dupe_groups:
        print(f"⚠️  {len(dupe_groups)} duplicate SentenceSimplified group(s) found "
              f"({dupe_skipped} extra copies — oldest kept, duplicates skipped):\n")
        for text, entries in list(dupe_groups.items())[:20]:
            label = text[:60] + ("…" if len(text) > 60 else "")
            ids = [e[0] for e in entries]
            print(f"  keep {ids[0]}  skip {ids[1:]}  \"{label}\"")
        if len(dupe_groups) > 20:
            print(f"  … and {len(dupe_groups) - 20} more")
        print()
    else:
        print("✓ No duplicate SentenceSimplified values found.\n")

    # ── Report updates ────────────────────────────────────────────────────────
    print(f"Already correct : {already_ok}")
    print(f"Need updating   : {len(to_update)}")
    print(f"Dupe skipped    : {dupe_skipped}")

    if not to_update:
        print("\nNothing to update.")
        return

    if dry_run:
        print("\nSample changes:")
        for note_id, new_key in to_update[:10]:
            print(f"  {note_id}  →  Key={repr(new_key[:60])}")
        if len(to_update) > 10:
            print(f"  … and {len(to_update) - 10} more")
        print("\nDry-run complete. Run with --update to apply.")
        return

    # ── Apply updates ─────────────────────────────────────────────────────────
    print("\nUpdating...")
    updated = 0
    errors  = 0
    for note_id, new_key in to_update:
        try:
            anki("updateNoteFields", note={"id": note_id, "fields": {KEY_FIELD: new_key}})
            updated += 1
            if updated % 100 == 0:
                print(f"  {updated}/{len(to_update)}")
        except RuntimeError as exc:
            print(f"  [WARN] note {note_id}: {exc}")
            errors += 1

    print(f"""
=== Done ===
  Updated : {updated}
  Errors  : {errors}
  Skipped (dupes) : {dupe_skipped}
""")


if __name__ == "__main__":
    main()
