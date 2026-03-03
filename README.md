# Recipemaker: Recipe → Shopping List

A Next.js web app that turns recipe links (including best-effort TikTok links) into structured, scalable, shareable shopping lists.

## Features

- Paste a normal recipe URL and extract ingredients (JSON-LD first, HTML fallback)
- Paste a TikTok URL and attempt extraction from public metadata (oEmbed)
- Manual ingredient paste fallback when extraction fails
- Parse ingredient lines into quantity, unit, name, and extra notes
- Mark ingredients as “already have this”
- Final shopping list panel that only shows remaining items
- Scale servings dynamically using original vs target servings
- Shareable public, read-only list at `/share/[shareId]`
- Copy final list + Web Share API integration with clipboard fallback

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate Prisma client and create DB schema:

   ```bash
   npx prisma migrate dev --name init
   ```

3. Run dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment

Copy `.env.example` to `.env` if needed:

```env
DATABASE_URL="file:./dev.db"
```

## How extraction works

### Normal recipe URLs

1. Fetch page HTML server-side
2. Parse `application/ld+json` blocks and look for `@type: Recipe`
3. Extract `name`, `recipeIngredient`, and `recipeYield`
4. If JSON-LD fails, scrape common HTML selectors containing `ingredient`
5. If both fail, app prompts for manual ingredient paste

### TikTok URLs (best effort)

1. Request TikTok oEmbed (`https://www.tiktok.com/oembed?url=...`)
2. Use public metadata title/caption-like text when available
3. Attempt ingredient parsing from that text
4. If transcript/caption isn’t available publicly, app explains limitation and asks for manual text

## Ingredient parsing and scaling

- Handles whole numbers, fractions (`1/2`), mixed numbers (`1 1/2`), and common unicode fractions (`½`)
- Normalizes common units (`tsp`, `tbsp`, `cup`, `g`, `kg`, `ml`, `l`, `oz`, `lb`, etc.)
- Stores base quantities and computes scaled values:

  ```text
  scaledQuantity = originalQuantity * (targetServings / originalServings)
  ```

- Displays user-friendly quantities (fraction-like output for non-metric units, compact decimals for metric)

## Sharing

- Each shopping list gets a unique `shareId`
- Public read-only route: `/share/[shareId]`
- Shared page shows unchecked (remaining) items only
- “Copy list” available on shared view

## Deployment

This app is deploy-ready for platforms like Vercel/Render/Fly with SQLite-compatible storage.

- Ensure Prisma client is generated in build step if needed:

  ```bash
  npx prisma generate
  npm run build
  ```

- For production persistence, mount durable storage or switch Prisma datasource to hosted DB.

## Limitations

- Some recipe websites block server-side fetches or bot user-agents.
- TikTok transcript/caption access is limited without private APIs; extraction is intentionally best-effort and transparent.
- Ingredient parsing is heuristic and may need manual correction for unusual formats.
