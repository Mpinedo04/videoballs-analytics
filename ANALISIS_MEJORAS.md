# Analisis profundo de VideoBalls Analytics

Fecha: 2026-06-18

## Estado de implementacion

Implementado el 2026-06-18:

- Rutas sensibles protegidas con `ADMIN_SECRET`/`CRON_SECRET`.
- `/api/refresh` y `/api/cron/update-stats` unificados en `src/lib/syncVideos.ts`.
- Matching entre videos corregido con agrupacion en memoria y reutilizacion de `group_id`.
- Snapshots diarios/horarios centralizados y poda de snapshots horarios antiguos.
- Fetchers ajustados para no ocultar errores reales como listas vacias.
- Canvas optimizado con rango vertical real, resize observer, conexiones precalculadas y apertura de detalle en vez de salto externo.
- Fondo de particulas optimizado con limite por viewport, DPR cap, pausa por visibilidad y respeto de `prefers-reduced-motion`.
- Nuevo drawer de detalle por video y nuevo radar de rendimiento.
- Chat/Oraculo protegido y alimentado con contexto estructurado de videos, crecimiento, hashtags y duracion.
- README actualizado con variables de entorno nuevas.

Validacion realizada:

- `tsc --noEmit`: correcto.
- `next build`: correcto usando variables dummy de Supabase/Gemini/Admin para permitir la recoleccion de datos local.
- `eslint .`: sigue fallando por deuda previa del repositorio, especialmente scripts debug con `require`, usos antiguos de `any` y reglas nuevas de React hooks.

## Resumen ejecutivo

VideoBalls Analytics tiene una idea buena: convertir metricas de videos cortos en una visualizacion fisica, con bolas por plataforma, anillos de velocidad, historial, buscador e IA. El concepto encaja muy bien para un dashboard visual de contenido.

El problema no es la idea. El problema es que la app mezcla muchas decisiones generadas deprisa: componentes grandes, mucha logica duplicada, rutas publicas con permisos peligrosos, textos con codificacion rota, animaciones que pueden costar demasiado y algunos bugs de datos/layout.

Mi recomendacion es mejorarla por fases, no rehacerla entera.

## Como funciona ahora

1. La pagina principal `src/app/page.tsx` carga videos desde `/api/videos`, snapshots desde `/api/snapshots` y permite refrescar datos llamando a `/api/refresh`.
2. Los conectores de redes estan en `src/lib/fetchers.ts`.
3. Los videos se guardan en Supabase en la tabla `videos`.
4. Al refrescar, se intenta agrupar videos parecidos entre plataformas usando `isVideoMatch` de `src/lib/utils.ts`.
5. El canvas principal `src/components/VideoCanvas.tsx` pinta bolas con D3, coloca cada video por plataforma y dia, y dibuja conexiones entre videos con el mismo `group_id`.
6. Los anillos de velocidad se calculan con `src/lib/velocityRing.ts`, comparando visitas actuales contra snapshots anteriores.
7. La IA usa Gemini en `/api/chat` y `/api/insights`, leyendo datos de Supabase y generando respuestas en contexto.
8. Hay panel admin en `/admin` para editar manualmente `group_id`.

## Prioridad 1: seguridad y control de acceso

### Rutas peligrosas abiertas

Hay rutas que escriben o borran datos sin una capa clara de autenticacion:

- `src/app/api/refresh/route.ts`: permite refrescar y escribir datos.
- `src/app/api/chat/route.ts`: permite consumir Gemini/API y guardar conversaciones.
- `src/app/api/conversations/route.ts`: permite listar, crear y borrar conversaciones.
- `src/app/api/debug/wipe/route.ts`: borra la tabla `videos`.
- `src/app/admin/page.tsx`: edita `group_id` desde cliente.

Esto deberia protegerse antes de pulir animaciones. Si la web esta publica, cualquiera podria disparar costes, tocar datos o borrar videos si encuentra las rutas.

Mejoras recomendadas:

- Proteger `/admin` y rutas de escritura con auth simple.
- Eliminar o desactivar `/api/debug/wipe` en produccion.
- Exigir secreto en `/api/refresh`, igual que el cron.
- Separar rutas publicas de rutas internas.
- Revisar RLS de Supabase para que el cliente anonimo no pueda editar datos.

## Prioridad 2: bugs de datos

### Agrupacion de videos duplicados

La logica actual puede asignar un `group_id` solo a uno de los dos videos que hacen match. Si el video A encuentra el video B, se actualiza A, pero B puede quedarse sin grupo porque la lista `groupedVideos` se calculo antes.

Mejor solucion:

- Traer videos candidatos.
- Calcular todos los grupos en memoria.
- Actualizar ambos lados del match en batch.
- Reutilizar `group_id` existente si uno de los videos ya lo tenia.

### Codigo duplicado entre refresh y cron

`src/app/api/refresh/route.ts` y `src/app/api/cron/update-stats/route.ts` repiten mucha logica:

- fetch por plataforma
- upsert
- matching
- snapshots diarios
- snapshots horarios
- mock data

Mejor solucion:

- Crear un servicio `src/lib/syncVideos.ts`.
- Hacer que refresh y cron llamen al mismo flujo.
- Devolver resultados por plataforma, con errores y conteos.

### Errores silenciosos

Los fetchers devuelven `[]` si falla una API. Eso hace que un error real parezca "no hay videos".

Mejor solucion:

- Devolver `{ ok, videos, error }` por plataforma.
- Mostrar en UI: YouTube OK, Instagram token caducado, TikTok sin permisos, etc.

## Prioridad 3: rendimiento

### ParticleBackground

`src/components/ParticleBackground.tsx` calcula conexiones entre todas las particulas contra todas las demas. Es O(n^2). En pantallas grandes puede ponerse caro.

Mejoras:

- Limitar particulas a un maximo fijo, por ejemplo 160-220.
- Usar grid espacial para comprobar solo particulas cercanas.
- Respetar `prefers-reduced-motion`.
- Pausar animacion si la pestana no esta visible.
- No leer `document.documentElement` en cada frame; guardar tema en ref.

### VideoCanvas

Problemas detectados:

- `effectiveDays` reduce la altura segun numero de videos, pero los nodos se colocan por `dayIndex` real. Videos antiguos pueden quedar fuera del SVG.
- Falta `prevSnapshot` en dependencias del `useEffect`, asi que los anillos pueden no actualizarse cuando llega el snapshot.
- No hay `ResizeObserver`; si cambia el ancho, las columnas D3 no se recalculan.
- Las conexiones se recalculan en cada tick.

Mejoras:

- Calcular altura por rango real de dias visibles, no por cantidad de videos.
- Incluir `prevSnapshot` en dependencias o actualizar anillos en efecto separado.
- Anadir `ResizeObserver`.
- Precalcular conexiones por `group_id`.
- Considerar Canvas/WebGL si se supera cierto numero de nodos.

## Prioridad 4: experiencia visual

### Lo bueno

- La metafora de bolas por plataforma funciona.
- Los anillos de velocidad son una idea potente.
- El dashboard tiene una identidad propia.
- El fondo reactivo y el modo sync tienen potencial.

### Lo que ahora baja calidad percibida

- Hay demasiadas capas visuales a la vez: grid, particulas, orbes, glass, glow, bolas, anillos, emojis.
- Hay mezcla de ingles y espanol.
- Hay texto con codificacion rota en la UI, por ejemplo nombres y palabras con acentos que aparecen como caracteres raros.
- El modo claro intenta sobrescribir colores de Tailwind desde CSS global; puede romper contrastes.
- Muchas tarjetas compiten por atencion.

Mejor direccion estetica:

- Mantener modo oscuro como principal.
- Usar una paleta mas editorial: fondo oscuro, acentos por plataforma y un color secundario para IA.
- Reemplazar emojis por iconos consistentes.
- Hacer el canvas el protagonista.
- Convertir sidebar en panel de control mas limpio.
- Crear estados vacios y errores mejor disenados.
- Usar microinteracciones suaves: hover en bolas, pulso de sync, transiciones de filtros.

## Mejoras de funcionalidades

### 1. Vista de detalle por video

Al hacer click en una bola, abrir drawer lateral con:

- miniatura
- enlace al video
- plataforma
- visitas actuales
- crecimiento 24h
- engagement rate
- hashtags
- videos relacionados del mismo grupo

Ahora el click abre directamente el video externo, perdiendo la oportunidad de explorar datos.

### 2. Comparador de plataformas

Para un mismo `group_id`, mostrar comparativa:

- mismo contenido en YouTube vs TikTok vs Instagram
- quien despego antes
- quien crecio mas
- ratio likes/vistas por plataforma
- recomendacion de donde replicar contenido

Esto es probablemente la funcionalidad mas valiosa del proyecto.

### 3. Radar de contenido ganador

Crear un ranking con explicacion:

- videos que estan acelerando
- videos que se estancaron
- mejores hooks/titulos
- hashtags que repiten buen rendimiento
- hora y dia con mejor rendimiento

### 4. Timeline real

El timeline actual es por dia, pero puede evolucionar a:

- agrupacion por semanas
- zoom 7d / 30d / todo
- filtro por plataforma
- filtro por rango de visitas
- modo "solo ganadores"

### 5. IA mas util

La IA ahora mete hasta 50 videos en prompt. Puede mejorar mucho si se le pasa un resumen calculado:

- top 10 por crecimiento
- top 10 por engagement
- peores 10
- promedios por plataforma
- patron por hora
- patron por duracion

Asi responde mejor, cuesta menos y no se pierde entre datos.

## Refactor recomendado

### Fase A: seguridad y estabilidad

- Proteger rutas de escritura.
- Desactivar debug wipe en produccion.
- Arreglar agrupacion de videos.
- Extraer `syncVideos`.
- Arreglar encoding roto.

### Fase B: rendimiento

- Optimizar `ParticleBackground`.
- Arreglar altura/responsive del `VideoCanvas`.
- Separar calculos pesados en hooks con `useMemo`.
- Revisar snapshots horarios y retencion.

### Fase C: UI

- Redisenar layout principal.
- Crear drawer de detalle de video.
- Simplificar sidebar.
- Pulir modo oscuro.
- Mejorar estados de carga/error/sin datos.

### Fase D: funcionalidades premium

- Comparador por grupo.
- Ranking de aceleracion.
- IA basada en resumen estructurado.
- Exportar informe semanal.
- Alertas de video despegando.

## Verificacion realizada

- Se leyeron componentes principales, rutas API y librerias internas.
- No se modifico codigo de aplicacion.
- No se pudo ejecutar `npm ci`, `npm run lint` ni `npm run build` porque `npm` no esta disponible en este entorno.
- El repo estaba limpio antes de crear este informe local.
