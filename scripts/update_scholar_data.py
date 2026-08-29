#!/usr/bin/env python3
"""
Fetches Manmeet Singh's Google Scholar profile (author id 4F4aasoAAAAJ) and
writes the citation stats + recent publications to data/*.json for the
static site to read at page-load time.

Google Scholar blocks automated traffic aggressively and without warning, so
this script is written to fail *quietly*: if the fetch doesn't succeed, it
leaves the existing data files untouched and exits 0. The site then just
keeps showing the last successfully-fetched numbers until a future run gets
through. Nothing here should ever break the page.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHOLAR_AUTHOR_ID = "4F4aasoAAAAJ"
MAX_PUBLICATIONS = 8
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
STATS_FILE = DATA_DIR / "scholar-stats.json"
PUBLICATIONS_FILE = DATA_DIR / "publications.json"


def infer_badge(citation_text: str) -> str:
    text = (citation_text or "").lower()
    if "arxiv" in text or "preprint" in text:
        return "Preprint"
    if "thesis" in text or "dissertation" in text:
        return "Thesis"
    return "Journal"


def fetch_author_data():
    from scholarly import scholarly

    author = scholarly.search_author_id(SCHOLAR_AUTHOR_ID)
    author = scholarly.fill(
        author, sections=["basics", "indices", "publications"], sortby="year"
    )
    return author


def build_publication_entries(author: dict) -> list:
    pubs = author.get("publications", [])

    def sort_key(pub):
        bib = pub.get("bib", {})
        try:
            year = int(bib.get("pub_year", 0))
        except (TypeError, ValueError):
            year = 0
        return (year, pub.get("num_citations", 0))

    pubs_sorted = sorted(pubs, key=sort_key, reverse=True)

    entries = []
    seen_titles = set()
    for pub in pubs_sorted:
        bib = pub.get("bib", {})
        title = bib.get("title", "").strip()
        if not title or title.lower() in seen_titles:
            continue
        seen_titles.add(title.lower())

        citation_text = bib.get("citation", "")
        entries.append(
            {
                "title": title,
                "year": bib.get("pub_year", ""),
                "citation": citation_text,
                "num_citations": pub.get("num_citations", 0),
                "badge": infer_badge(citation_text),
                "url": pub.get("pub_url", ""),
            }
        )
        if len(entries) >= MAX_PUBLICATIONS:
            break
    return entries


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    try:
        author = fetch_author_data()
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see module docstring
        print(f"[update_scholar_data] fetch failed, leaving existing data in place: {exc}")
        return 0

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    stats = {
        "name": author.get("name"),
        "citedby": author.get("citedby", 0),
        "hindex": author.get("hindex", 0),
        "i10index": author.get("i10index", 0),
        "num_publications": len(author.get("publications", [])),
        "last_updated": now,
        "source": "google_scholar",
        "profile_url": f"https://scholar.google.com/citations?user={SCHOLAR_AUTHOR_ID}",
    }

    publications = {
        "last_updated": now,
        "entries": build_publication_entries(author),
    }

    STATS_FILE.write_text(json.dumps(stats, indent=2) + "\n")
    PUBLICATIONS_FILE.write_text(json.dumps(publications, indent=2) + "\n")
    print(f"[update_scholar_data] wrote {STATS_FILE.name} and {PUBLICATIONS_FILE.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
