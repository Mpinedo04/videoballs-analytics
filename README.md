# VideoBalls Analytics 🎥 🎾

A high-performance, visually stunning video analytics dashboard built with **Next.js 15**, **D3.js**, and **Supabase**.

## Features

- **Interactive D3 Visualization**: Responsive SVG-based "VideoBalls" with collision physics and strictly categorized columns.
- **Cross-Platform Analytics**: Unified view for YouTube Shorts, TikTok, and Instagram Reels.
- **Auto-Matching (Fuzzy)**: Automatically connects videos across platforms using fuzzy title matching and temporal proximity (±2h).
- **Dual 'Velocity Rings'**: Track 24h performance using either 'Balanced' (relative %) or 'Impact' (absolute volume) scaling.
- **Automated TikTok Auth**: Self-healing TikTok API tokens via Supabase.
- **Automated Cron Updates**: Hourly data discovery and view count refreshing via Vercel Cron.

---

## Getting Started (Quick Setup) 🚀

### 1. Supabase Initialization (Priority)
Before running the app, you must set up your database:
1.  **SQL Editor**: Copy the contents of `supabase_schema.sql` and run them in your Supabase SQL Editor.
2.  **Verify Keys**: I have already created your `.env.local` with the following credentials:
    - URL: `https://tnimwwnnnhekrzowygik.supabase.co`
    - Keys: Loaded and ready.

**For a step-by-step visual guide, see [INSTRUCCIONES_SUPABASE.md](./INSTRUCCIONES_SUPABASE.md).**

### 2. Prerequisites
- [YouTube Data API v3](https://console.cloud.google.com/) Key
- [Meta Graph API](https://developers.facebook.com/) Token
- [TikTok Business API](https://developers.tiktok.com/) (Tokens are now stored and auto-refreshed in Supabase `platform_settings` table).

### 3. Installation
```bash
npm install
npm run dev
```
The app will be live at `http://localhost:3000`.

### 4. Configuration
Open `.env.local` to add your social media API keys. While you get them, the app will run with **Mock Data** (`USE_MOCK_DATA=true`).

---

## Deployment on Vercel

1. **Push to GitHub**.
2. **Connect to Vercel**.
3. **Add Environment Variables** in Vercel project settings.
4. **Enable Cron Jobs**:
   - The project includes a `vercel.json` configuration for the hourly cron job at `/api/cron/update-stats`.
   - Ensure `VERCEL_CRON_SECRET` is set in Vercel to allow the job to run.

---

## Algorithm: Automatic Group Matching

The system uses the following logic to link videos sharing the same content across platforms:
1. **Title Normalization**: Lowercase, removal of special characters, and trimming.
2. **Fuzzy Comparison**: Uses `string-similarity` (Sørensen–Dice coefficient) with a threshold of **0.8**.
3. **Temporal Window**: Videos must be published within a **±2 hour** window to be considered matches.
4. **Manual Override**: If the algorithm fails, use the `/admin` dashboard to manually set a shared `group_id`.

---

## ⚠️ Important Notes

- **TikTok API**: If your app is not yet approved by TikTok, keep `USE_MOCK_DATA=true` or use the provided mock toggle. **Do not use scrapers** as they violate platform policies and risk account suspension.
- **SVG Performance**: The D3 engine is optimized for up to 500 balls. High concurrency may require switching to Canvas for ultra-dense datasets.
