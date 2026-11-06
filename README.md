# AIR Lab website

Website of the AI Research Laboratory (AIR Lab) at Western Kentucky University's
Disaster Science Operations Center. Live at https://air-lab-wku.github.io/.

It is a static site with no build step: GitHub Pages serves the files as they are.

## Folders

| Path | What it holds |
|---|---|
| `index.html` | The page |
| `css/site.css` | All styles |
| `js/site.js` | Live weather, alerts, hero animation, demos, news and publication lists |
| `data/news.json` | Lab news. Edit this file to add news, newest first, with no code changes |
| `data/publications.json`, `data/scholar-stats.json` | Filled automatically from Google Scholar |
| `img/` | Team photos, `img/logos/` (WKU, Ogden, EEAS), `img/partners/` (partner logos) |
| `scripts/update_scholar_data.py`, `.github/workflows/update-scholar-data.yml` | The Scholar auto-update |

## Common edits

- **Add a news item:** copy an entry in `data/news.json` and change it. `links` can hold several `{ "url", "label" }` pairs.
- **Add a team photo:** save a 4:5 portrait in `img/` and point the `<img>` in the Team section at it.
- **Add a partner logo:** put the file in `img/partners/` and set `data-logo="img/partners/<file>"` on that partner's `<li>`.
- **After changing `css/site.css` or `js/site.js`:** raise the `?v=` number on their links at the top and bottom of `index.html`, so visitors' browsers fetch the new version.

## Publication auto-update

The GitHub Actions workflow runs Monday, Wednesday and Friday at 13:00 UTC, and can also be started by hand from the Actions tab.
It needs *Settings → Actions → General → Workflow permissions* set to **Read and write**.
Google Scholar sometimes blocks the runner. A failed run leaves the existing data in place, so just re-run it.

## Live data

Weather comes from [Open-Meteo](https://open-meteo.com/) and alerts from the [National Weather Service API](https://www.weather.gov/documentation/services-web-api). Neither needs a key.
