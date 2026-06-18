# Reporte de limpieza

Fecha: 2026-06-18

## Resumen

Se sustituyo el README antiguo por documentacion actual del proyecto y se eliminaron archivos obsoletos, pruebas sueltas, assets de plantilla y scripts auxiliares con secretos hardcodeados.

## Que se anadio

- `README.md`: documentacion actual del dashboard, demo, tecnologias, scripts, estructura, rutas y variables de entorno.
- `CLEANUP_REPORT.md`: este reporte de limpieza.

## Que se quito

### Documentacion antigua o insegura

Se eliminaron estos documentos porque estaban desactualizados, tenian codificacion rota o incluian informacion sensible que no conviene mantener en el estado actual del repo publico:

- `resumen_proyecto_videoballs.md`
- `GUIA_REVISION_EXPERTO.md`
- `REDEPLOY_TRIGGER.md`

Motivos principales:

- Texto con mojibake/codificacion rota en varias secciones.
- Referencias a rutas locales antiguas.
- Documentacion generada para auditorias o sesiones anteriores, no para mantenimiento actual.
- Presencia de ejemplos o valores de credenciales/API keys en la memoria tecnica.
- `REDEPLOY_TRIGGER.md` solo existia para forzar un despliegue puntual de Vercel.

### Prueba HTML suelta

Se elimino:

- `test-invert.html`

Era una prueba aislada de inversion visual, fuera de la aplicacion Next.js y sin referencias desde el codigo.

### Assets de plantilla de Next.js no usados

Se eliminaron SVGs por defecto que no estaban referenciados por la aplicacion:

- `public/next.svg`
- `public/globe.svg`
- `public/file.svg`
- `public/vercel.svg`
- `public/window.svg`

### Scripts auxiliares con secretos hardcodeados

Se eliminaron scripts manuales que contenian claves/API secrets hardcodeadas o imprimian tokens directamente:

- `scripts/exchange-token.js`
- `scripts/get-tiktok-token.js`
- `scripts/test-gemini.js`

El resto de scripts de diagnostico se conservaron porque leen credenciales desde variables de entorno y pueden seguir siendo utiles para mantenimiento puntual.

## Que no se quito

- No se tocaron componentes de la aplicacion.
- No se tocaron rutas de API.
- No se tocaron dependencias ni configuracion de Vercel.
- No se tocaron scripts que usan variables de entorno en vez de secretos hardcodeados.
- No se tocaron los archivos `public/tiktok*.txt`, porque parecen verificaciones de plataforma/dominio.

## Comprobacion realizada

- Se verifico que los SVGs de plantilla y los documentos eliminados no estuvieran referenciados por la aplicacion.
- Se comprobo que el README antiguo enlazaba a archivos inexistentes como `INSTRUCCIONES_SUPABASE.md` y `supabase_schema.sql`.
- Se detectaron y retiraron scripts con credenciales hardcodeadas.

## Pendientes recomendados

- Rotar las claves/API secrets que aparecian en documentacion o scripts, aunque ya se hayan eliminado del estado actual del repo.
- Revisar el historial Git si se quiere eliminar por completo la exposicion historica de secretos.
- Revisar textos visibles con codificacion rota en la UI, por ejemplo `Raul`, `Ultimos` o textos con acentos que aparecen como mojibake.
- Ejecutar `npm run lint` y `npm run build` tras instalar dependencias si se quiere una validacion completa.
