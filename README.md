# GNovel

A **Letterboxd + Backloggd** inspired graphic novel, comic, and manga cataloging platform — built with Next.js 16 (static export) so it runs seamlessly on **GitHub Pages** with zero backend required.

## Features

- **Curated Canon + Live Open Library Search**: Browse 26 landmark graphic novels out of the box, or search Open Library's live catalog directly from your browser.
- **Half-Star Ratings & 5 Shelf Statuses**: Track `Completed`, `Reading`, `Plan to Read`, `On Hold`, and `Dropped`, rate with `0.5★`–`5.0★` half-stars, favorite/like, and step through issue progress.
- **Reading Diary**: Chronological reading journal grouped by month with edition format (`TPB`, `Hardcover / Omnibus`, `Single Issues`, `Digital`), re-read flags, and spoiler-protected reviews.
- **Four Favorites & Reader Stats**: Pin your top 4 graphic novels and inspect your rating distribution histogram.
- **Custom Ranked & Unranked Lists**: Build your own reading orders and top-10 lists alongside curated editorial collections.
- **Portable JSON Backup**: Export and restore your entire library, diary, and lists anytime.

## Local Development

```bash
npm install
npm run dev
```

## Static Export & GitHub Pages

GNovel is configured with `output: "export"` and `trailingSlash: true` in `next.config.ts`.

To test the exact GitHub Pages subpath build locally:

```bash
NEXT_PUBLIC_BASE_PATH=/gnovel npm run build
```

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds `out/` and deploys automatically to GitHub Pages.
