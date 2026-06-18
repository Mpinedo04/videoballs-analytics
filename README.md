# VideoBalls Analytics

Dashboard de analitica para videos cortos desarrollado con **Next.js**, **React**, **D3.js** y **Supabase**.

El proyecto centraliza metricas de YouTube Shorts, Instagram Reels y TikTok en una interfaz visual basada en bolas, fisicas y comparativas por plataforma. Tambien incluye busqueda de videos, tarjetas de estadisticas, historico de actividad, analisis de contenido y un modulo de insights con Gemini.

## Demo

[https://videoballs-analyticsraulmiguel2.vercel.app/](https://videoballs-analyticsraulmiguel2.vercel.app/)

## Tecnologias

- Next.js
- React
- TypeScript
- D3.js
- Supabase
- Framer Motion
- Gemini API
- Vercel Cron

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Estructura principal

```text
.
+-- src/
|   +-- app/
|   |   +-- api/
|   |   +-- admin/
|   |   +-- page.tsx
|   +-- components/
|   +-- lib/
|   +-- styles/
+-- public/
+-- scripts/
+-- package.json
+-- vercel.json
```

## Rutas principales

- `/`: dashboard principal.
- `/admin`: panel de administracion de videos.
- `/api/videos`: consulta de videos.
- `/api/refresh`: sincronizacion manual de datos.
- `/api/snapshots`: historico de snapshots.
- `/api/insights`: insights generados con Gemini.
- `/api/cron/update-stats`: actualizacion programada desde Vercel Cron.

## Variables de entorno

El proyecto necesita claves externas para Supabase, redes sociales y Gemini. No deben subirse claves reales al repositorio.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

YOUTUBE_API_KEY=
YOUTUBE_CHANNEL_ID=

INSTAGRAM_ACCESS_TOKEN=

TIKTOK_ACCESS_TOKEN=
TIKTOK_REFRESH_TOKEN=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

GOOGLE_GENERATIVE_AI_API_KEY=

USE_MOCK_DATA=
VERCEL_CRON_SECRET=
CRON_SECRET=
```

## Notas de mantenimiento

- Los conectores de datos estan en `src/lib/fetchers.ts`.
- La conexion a Supabase esta en `src/lib/supabase.ts`.
- El motor visual principal esta en `src/components/VideoCanvas.tsx`.
- Los scripts de `scripts/` son utilidades manuales de diagnostico o sincronizacion; ejecutalos solo con variables de entorno locales.
- Los archivos `public/tiktok*.txt` son verificaciones de dominio/plataforma y no deben eliminarse sin confirmar que ya no se necesitan.
- La rama activa del repositorio es `master`.
