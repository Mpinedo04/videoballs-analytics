# Instrucciones de Configuración Supabase 🚀

Sigue estos pasos detallados para poner en marcha tu base de datos y la aplicación.

## 1. Configurar la Base de Datos (SQL Editor)

1. Entra en tu panel de **Supabase** -> Proyecto `tnimwwnnnhekrzowygik`.
2. En la barra lateral izquierda, haz clic en **SQL Editor** (icono de `>_`).
3. Haz clic en **"New Query"**.
4. Busca el archivo `supabase_schema.sql` (puedes encontrarlo en la carpeta de este proyecto o en los artefactos generados).
5. **Copia y pega** todo el contenido de `supabase_schema.sql` en el editor de Supabase.
6. Dale al botón **Run** (esquina inferior derecha). 
   - *Deberías ver un mensaje confirmando que el tipo `platform_type` y la tabla `videos` se han creado correctamente.*

## 2. Instalación de Dependencias

Abre una terminal en la carpeta raíz del proyecto (`videoballs-analytics`) y ejecuta:

```bash
npm install
```

*Nota: Esto descargará D3.js, Supabase SDK, Lucide Icons, Framer Motion y las utilidades de matching fuzzy.*

## 3. Arrancar la Aplicación

En la misma terminal, ejecuta:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 4. ¿Qué deberías ver?

Al abrir la web:
1. **Llamada a la API**: La app intentará leer de Supabase. Como la tabla está vacía, verás un lienzo oscuro con las tres columnas (`YouTube Shorts`, `TikTok`, `Instagram Reels`).
2. **Mock Data (Modo Demo)**: En tu archivo `.env.local`, la variable `USE_MOCK_DATA` está en `true`. 
3. **Poblar datos**: Haz clic en el botón **"Refresh Data"** o visita `http://localhost:3000/api/cron/update-stats` (con una cabecera de autorización o desactivando temporalmente el check de seguridad en el código) para ver cómo aparecen las primeras "bolas" de prueba en tu base de datos de Supabase.
4. **Verificación en Supabase**: Si vuelves a Supabase y vas a **Table Editor**, verás que la tabla `videos` ahora tiene filas con IDs, títulos y URLs.

¡Listo! Ya tienes el motor de VideoBalls conectado a tu propia base de datos.
