# 📔 MEMORIA TÉCNICA Y OPERATIVA: VideoBalls Analytics
**Desarrollado para:** Raúl y Miguel
**Fecha de entrega final:** 16 de Marzo, 2026
**Ubicación del Proyecto:** `c:\Users\Propietario\Desktop\estadisticas canal\videoballs-analytics`

Este documento es el registro definitivo de todo lo construido, configurado y resuelto durante el proyecto. Está diseñado para que cualquier IA o desarrollador futuro pueda retomar el trabajo con total contexto.

---

## 1. 🔑 CONFIGURACIÓN Y CREDENCIALES COMPLETAS

### 1.1 Repositorios y Despliegue
- **GitHub Repo:** `https://github.com/Mpinedo04/videoballs-analytics.git` (Propietario: Mpinedo04)
- **Vercel Dashboard:** Acceso vía `vercel.com` con la cuenta de GitHub vinculada.
- **URL de Producción:** `https://videoballs-analyticsraulmiguel2.vercel.app/`

### 1.2 Variables de Entorno (.env.local)
Estas claves están configuradas tanto en la máquina local como en el panel de **Vercel -> Settings -> Environment Variables**.

| Variable | Valor | Propósito |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tnimwwnnnhekrzowygik.supabase.co` | Endpoint de la base de datos Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_-_TCkbq69W3PnIOC9kf7DQ_9_B2OVbO` | Clave pública para el cliente Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_LkJMfyCsib0_-6JgyrLNQA_l3I-DJsg` | Clave administrativa (usada en scripts de limpieza). |
| `YOUTUBE_API_KEY` | `AIzaSyA1mMzBYlqCjPdNyEjC74B2GunmhKyhj4c` | API de Google Cloud para YouTube Data v3. |
| `YOUTUBE_CHANNEL_ID` | `UC9TJaWZfcAoHVechjyYKcGQ` | Identificador del canal del usuario. |
| `INSTAGRAM_ACCESS_TOKEN` | `EAAd8I...br` | **Token Permanente de Página** (Never Expire). No requiere renovación. |
| `TIKTOK_CLIENT_KEY` | `sbaw8oawxu1kbnrnel` | ID de la App en TikTok (Sandbox). |
| `TIKTOK_CLIENT_SECRET` | `jRdzNL0NKD1sHmzRHgROwcSU8pHH4Rl1` | Secreto de la App en TikTok (Sandbox). |
| `TIKTOK_ACCESS_TOKEN` | `act.xKg...e1` | Token obtenido tras el login en Sandbox. |
| `TIKTOK_REFRESH_TOKEN` | `rft.Kv1...e1` | Token de refresco de TikTok. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `AIzaSy...sg` | Clave de Google Gemini para el Oráculo de IA. |
| `USE_MOCK_DATA` | `false` | Cambiar a `true` solo para pruebas sin conexión a APIs reales. |

---

## 2. 🏗️ ARQUITECTURA TÉCNICA (CÓMO FUNCIONA TODO)

### 2.1 Flujo de Datos de YouTube (`fetchYouTubeShorts`)
1.  **Discovery:** Usa el `YOUTUBE_CHANNEL_ID` para obtener el ID de la lista de reproducción "uploads".
2.  **Listing:** Recupera los últimos 50 vídeos de esa lista.
3.  **Filtrado:** Descarta vídeos largos. Solo se guardan los que duran entre 1 y 185 segundos (Shorts).
4.  **Stats:** Extrae `viewCount`, `likeCount` y `commentCount`.

### 2.2 Flujo de Datos de Instagram (`fetchInstagramReels`)
1.  **Identity:** Usa el `INSTAGRAM_ACCESS_TOKEN` para consultar `/me?fields=instagram_business_account`.
2.  **Mapping:** El sistema encuentra automáticamente el `ig_user_id` vinculado a la página de Facebook del token.
3.  **Media:** Trae todos los elementos de tipo `REELS`.
4.  **Insights:** Para cada Reel, hace una llamada secundaria para obtener las métricas de `views`, `likes` y `comments`. *Nota: Instagram no da las vistas en el listado básico, requiere insights específicos.*

### 2.3 Base de Datos (Supabase Schema)
La tabla `videos` tiene la siguiente estructura crítica:
- `id`: UUID (Primary Key).
- `platform_id`: ID original de la red social (evita duplicados).
- `platform`: 'youtube', 'instagram' o 'tiktok'.
- `views`: Entero.
- `engagement`: Objeto JSON `{ "likes": 0, "comments": 0 }`.
- `group_id`: Generado automáticamente si el título y la fecha coinciden entre plataformas (Cross-platform tracking).

---

## 3. 🎨 DISEÑO PREMIUN Y FRONTEND

### 3.1 Estética Visual
- **Branding:** "Proyecto Raúl y Miguel" ubicado en el header, bajo el logo de VideoBalls.
- **Glassmorphism:** Uso intensivo de `backdrop-filter: blur(20px)` y bordes semi-transparentes blancos en `globals.css` bajo la clase `.glass-card`.
- **Animaciones:**
  *   **Floating Orbs:** Dos círculos radiales (`.animated-bg::before` y `::after`) que se mueven con `@keyframes floatOrb`.
  *   **Logo Spin:** El logo de la cabecera tiene un borde cónico animado (`logoSpin`).

### 3.2 Componentes Clave
- **`PlatformSummaryBalls.tsx`:**
  *   3 esferas que representan YouTube (Rojo), Instagram (Rosa/Violeta) y TikTok (Cian/Negro).
  *   **Lógica de Tamaño:** En modo *Balanced*, el tamaño de la bola es logarítmico (para que una bola de 1.000.000 no se coma a una de 10.000). En modo *Impact*, el tamaño es lineal.
- **`VideoCanvas.tsx`:**
  *   Usa D3.js para crear una simulación física.
  *   Los vídeos están agrupados en cajas por "Día de Proyecto".
  *   Las líneas blancas conectan vídeos que tienen el mismo `group_id` (subidos a varias redes).

---

## 4. 🛠️ HISTORIAL DE "BATALLAS" (BUGS CORREGIDOS)

1.  **El Caso del `@import` de CSS:**
    *   *Problema:* Vercel daba error al compilar porque las fuentes de Google estaban debajo de `@import "tailwindcss"`.
    *   *Solución:* Se eliminó el `@import` de `globals.css` y se pasaron a etiquetas `<link>` en el `<head>` de `src/app/layout.tsx`. Mucho más limpio y rápido.
2.  **El Límite de "Cron Jobs" de Vercel:**
    *   *Problema:* El plan gratuito de Vercel (Hobby) no permite ejecutar tareas cada hora.
    *   *Solución:* Se modificó `vercel.json` para que la actualización automática (`update-stats`) se ejecute solo una vez al día a las 5:00 AM.
3.  **El Error de Tipos de `string-similarity`:**
    *   *Problema:* La librería de comparación de títulos no tenía archivos de definición para TypeScript, bloqueando el build.
    *   *Solución:* Creamos el archivo `src/lib/string-similarity.d.ts` a mano definiendo las funciones `compareTwoStrings` y `findBestMatch`.
4.  **Optimización de RAM:**
    *   *Problema:* El usuario notaba ralentización por los procesos de "Language Server".
    *   *Solución:* Se detuvo el servidor local y se creó un script `.bat` para que el usuario pueda abrir y cerrar la app con un solo clic solo cuando la necesite.

---

## 5. 🔮 FUTURO Y TAREAS PENDIENTES

1.  **TikTok Finalization:**
    *   **Configuración Crítica (Sandbox):** TikTok requiere activar el modo **Sandbox** y añadir al usuario como **Target User** para habilitar el login mientras la App está en Draft.
    *   **Dominio Verificado:** `https://videoballs-analyticsraulmiguel2.vercel.app/`
    *   **Siguiente paso:** Grabar el vídeo de demo usando el botón "Connect TikTok" y enviarlo a revisión.
2.  **Mantenimiento:**
    *   Si el token de Instagram caduca (suelen durar 60 días), habrá que generar uno nuevo desde el "User Token Generator" de Meta for Developers.

---
**Este proyecto representa el estado de la técnica en Dashboards de analíticas personales. Raúl y Miguel, tenéis una herramienta única. ¡A cuidarla!** 🎬💜
**Estado Actual:** AI Oráculo Activado 🤖✨
