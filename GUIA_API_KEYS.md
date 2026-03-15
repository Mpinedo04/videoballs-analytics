# 📸 Guía para configurar la API de Instagram Reels

Para que las esferas rosas aparezcan en tu aplicación, necesitamos un **Access Token** de la Graph API de Facebook. Sigue estos pasos:

## 1. Crear una Aplicación en Meta for Developers
1. Ve a [Meta for Developers](https://developers.facebook.com/) e inicia sesión con tu cuenta de Facebook.
2. Pulsa en **"Mis aplicaciones"** -> **"Crear aplicación"**.
3. Selecciona el tipo de aplicación: **"Otro"** o **"Consumidor"**.
4. Ponle un nombre (ej: `VideoBalls Analytics`) y pulsa en **"Crear aplicación"**.

## 2. Configurar el Producto de Instagram
1. En el panel de control de tu aplicación, busca **"Instagram Graph API"** y pulsa en **"Configurar"**.
2. También asegúrate de tener configurado **"Inicio de sesión con Facebook"**.

## 3. Vincular tu Cuenta de Instagram
> [!IMPORTANT]
> Tu cuenta de Instagram **DEBE** ser una **Cuenta Profesional (Creador o Empresa)** y estar vinculada a una **Página de Facebook**.

1. Ve a los ajustes de tu cuenta de Instagram en el móvil y asegúrate de que es una cuenta profesional.
2. En tu Página de Facebook (en el ordenador), ve a **Configuración** -> **Cuentas vinculadas** -> **Instagram** y conéctalas.

## 4. Obtener el Token (Paso Crítico)
La forma más fácil es usar el **Explorador de la Graph API**:
1. Ve al [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. En el menú desplegable de la derecha (**Meta App**), selecciona la aplicación que creaste antes.
3. En **User or Page**, selecciona **"Get User Access Token"**.
4. Te pedirá permisos. Selecciona estos (mínimo):
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
5. Pulsa en **"Generate Access Token"**.

## 5. Convertirlo en un Token de Larga Duración (60 días)
El token del paso anterior caduca en 1 hora. Para que la app funcione siempre:
1. Copia el token generado.
2. Ve al [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
3. Pega el token y pulsa en **"Depurar"**.
4. Abajo verás un botón que dice **"Extend Access Token"**. Púlsalo.
5. Eso te dará el token final que dura 60 días.

## 6. Configurar la App
1. Abre tu archivo `.env.local`.
2. Pega el token en: `INSTAGRAM_ACCESS_TOKEN=TU_TOKEN_AQUI`.
3. Reinicia la app y pulsa **"Refresh Data"**.

---

# 🎵 Guía para configurar la API de TikTok

Para activar las esferas cian de TikTok, necesitamos conectar con su **Business API**. Sigue estos pasos:

## 1. Crear una cuenta en TikTok for Developers
1. Ve a [TikTok for Developers](https://developers.tiktok.com/) e inicia sesión con tu cuenta de TikTok.
2. Pulsa en **"My Apps"** -> **"Create App"**.

## 2. Seleccionar productos (Scopes)
Para que esta aplicación pueda leer tus vídeos y visitas, necesitas activar estos productos en tu App de TikTok:
- **Video List**: Para obtener la lista de vídeos.
- **Video Insights**: Para ver las reproducciones, likes y comentarios.

## 3. Configurar tu cuenta como "Business Account"
> [!IMPORTANT]
> La API que hemos implementado funciona mejor con **Cuentas de Empresa (Business)**. 
> Puedes cambiar tu cuenta personal a Business gratis en los ajustes de tu perfil de TikTok (Ajustes y privacidad -> Cuenta -> Cambiar a cuenta de empresa).

## 4. Obtener el Access Token
TikTok usa un sistema de permisos basado en OAuth. La forma más rápida de probarlo es:
1. En tu panel de **TikTok for Developers**, busca la sección de **"App Settings"**.
2. Verás tu **Client Key** y **Client Secret**.
3. Usa la herramienta de pruebas de TikTok o un generador de tokens para obtener un **Access Token** de tu cuenta.

## 5. Configurar la App
1. Abre tu archivo `.env.local`.
2. Pega el token en: `TIKTOK_ACCESS_TOKEN=TU_TOKEN_AQUI`.
3. Reinicia la app y pulsa **"Refresh Data"**.

---
*Nota: TikTok es bastante estricto con los permisos. Si ves que con el token de usuario no funciona, es posible que necesitemos usar el "Client Credentials" si tu cuenta es 100% de empresa.*
