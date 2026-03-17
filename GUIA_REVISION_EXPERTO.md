# 🧪 Guía para Revisión de Experto: VideoBalls Project

Este documento contiene el núcleo técnico de **VideoBalls Analytics**. Está diseñado para que un experto pueda entender la arquitectura, el flujo de datos y proponer mejoras de eficiencia o estilo.

---

## 🏗️ ARQUITECTURA GENERAL
- **Framework**: Next.js 14+ (App Router).
- **Frontend**: React + Tailwind CSS + Framer Motion.
- **Visualización**: D3.js (Force Simulation) dentro de un Canvas/SVG reactivo.
- **Base de Datos**: Supabase (PostgreSQL).
- **IA**: Google Gemini 2.5 Flash (SDK `@google/generative-ai`).
- **APIs Externas**: YouTube Data v3, Instagram Graph API, TikTok API v2.

---

## 📽️ 1. Visualización Central (`VideoCanvas.tsx`)
Este es el motor gráfico que convierte vídeos en "bolas" físicas que rebotan y se agrupan por día y plataforma.

### 💻 Código Fuente:
```tsx
// src/components/VideoCanvas.tsx
// ... (Código completo con simulación D3 Force y scroll automático)
// [VER ARCHIVO COMPLETO EN EL PROYECTO]
```

### 🧠 Notas para el Experto:
- **D3 Force Simulation**: Se usa para el posicionamiento dinámico y evitar solapamientos (`d3.forceCollide`).
- **React vs D3**: El DOM del SVG lo gestiona D3 (mediante `ref`), mientras que el estado de Tooltip y Highlighting lo gestiona React.
- **Highlight Logic**: Implementamos un sistema que, al buscar un vídeo, localiza el nodo en la simulación, hace scroll al contenedor y dispara una animación CSS de neón.
- **Punto de Mejora**: ¿Sería más eficiente usar Canvas de HTML5 en lugar de SVG si llegamos a >1000 nodos?

---

## 🔍 2. Buscador Inteligente (`VideoFinder.tsx`)
Módulo de búsqueda global con autocompletado, historial y soporte de voz.

### 💻 Código Fuente:
```tsx
// src/components/VideoFinder.tsx
// ... (Lógica de Debounce, Fuzzy Search y Web Speech API)
```

### 🧠 Notas para el Experto:
- **Debounce**: Implementado a 180ms para evitar re-renders excesivos durante la escritura.
- **Búsqueda Fuzzy**: Actualmente es un `.includes()` sobre Título, Plataforma e Hashtags. 
- **Accesibilidad**: Se ha tenido en cuenta el manejo de clics fuera del dropdown y estados de carga.
- **Punto de Mejora**: ¿Vale la pena meter `Fuse.js` para mejorar la tolerancia a errores tipográficos?

---

## 🤖 3. El Oráculo (IA Strategy API)
Procesamiento de datos masivo para generar estrategias personalizadas.

### 💻 Código Fuente (`route.ts`):
```typescript
// src/app/api/insights/route.ts
// ... (Prompt Engineering avanzado y conexión con Gemini 2.5 Flash)
```

### 🧠 Notas para el Experto:
- **Prompt Engineering**: Se agrupan los últimos 50 vídeos por plataforma y se le inyecta al modelo metadatos de duración y hashtags.
- **Tono**: Se fuerza un sistema de respuesta en 3 secciones (YT/IG/TT) con un estilo motivador "Premium".
- **Punto de Mejora**: ¿Deberíamos usar un esquema JSON estructurado (`response_mime_type: "application/json"`) para que el frontend pueda pintar los consejos con iconos específicos en lugar de texto plano?

---

## 📡 4. Sincronización de Datos (`fetchers.ts`)
Conectores con las APIs de Google, Meta y TikTok.

### 💻 Código Fuente:
```typescript
// src/lib/fetchers.ts
// ... (Extracción de Hashtags, parseo de duración ISO 8601 y Auth)
```

### 🧠 Notas para el Experto:
- **YouTube**: Se parsea el formato `PT##M##S` a segundos totales.
- **TikTok**: Usa el nuevo endpoint v2 de `/video/list`.
- **Instagram**: Requiere un flujo complejo de Page Token -> IG Business Account ID -> Media Insights.
- **Punto de Mejora**: Implementar un sistema de "retry con backoff" para cuando las cuotas de las APIs estén al límite.

---

## ⚡ 5. Sugerencias de Mejora Deseadas
Queremos que el experto nos diga:
1. **Eficiencia en D3**: ¿Cómo evitar que la simulación consuma CPU cuando el usuario no está haciendo scroll?
2. **Estilo Tailwind**: ¿Se pueden reutilizar más tokens (glassmorphism) de forma global?
3. **Manejo de Estado**: ¿Es mejor usar un Context o algo tipo Zustand para los datos de los vídeos en lugar de pasar props desde `page.tsx`?
4. **Resiliencia**: Mejorar el manejo de errores en los fetchers para que si una red falla (ej. TikTok), las demás sigan cargando.

---
*Documento generado por Antigravity para el equipo VideoBalls (Raúl & Miguel).* 🦁🦾👸
