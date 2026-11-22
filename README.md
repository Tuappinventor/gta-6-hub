# VICE HUB — MVP fase 2

## Probar la demo
Abre `index.html` con un servidor local (por ejemplo `npx serve .`). Sin credenciales funciona en modo demostración. La demo original mantiene ejemplos ficticios.

## Activar Supabase
1. Crea un proyecto en https://supabase.com/dashboard.
2. Abre SQL Editor y ejecuta `schema.sql` en una base de datos nueva. Revisa primero las políticas y permisos; no es una migración idempotente.
3. En Project Settings / API copia la URL y la clave **publicable/anon** a `config.js`. **Nunca** incluyas la clave service_role ni una clave secreta.
4. Configura Auth > URL Configuration para tu dominio y la confirmación de correo según necesites.
5. Sirve la web por HTTP o HTTPS, registra una cuenta e inicia sesión. La creación del perfil es automática.
6. Para conceder acceso editorial, localiza el UUID del usuario en Authentication > Users y ejecuta en SQL Editor: `update public.profiles set role='admin' where id='UUID_DEL_USUARIO';` No habilites cambios de rol desde el navegador.
7. Abre Editorial y publica tu primer artículo. Las noticias públicas y el progreso de marcadores verificados ya se consultan desde Supabase.

## Funciones implementadas
- Registro/inicio/cierre de sesión con Supabase Auth.
- Perfil y alias sincronizados; rol lector/editor/admin.
- Panel editorial con creación, publicación y eliminación de noticias/guías.
- Lectura pública de artículos publicados y vehículos/localizaciones verificados.
- Progreso de marcadores por cuenta con políticas RLS.
- Fallback demostrativo sin configuración.

## Limitaciones conocidas
- El editor aún no incluye edición de artículos existentes ni gestor de vehículos/localizaciones; se pueden gestionar desde Supabase Table Editor.
- El mapa es un esquema, no cartografía real del juego. No hay RSS automático ni IA.
- En modo conectado, la lista de guías todavía es una maqueta; los artículos de tipo guía aparecen en Noticias.
- El frontend es HTML/JS sin framework para desplegar rápido. Antes de una explotación comercial se recomienda migrar a Next.js, pruebas E2E, anti-spam, moderación, validación robusta, CSP y un backend seguro para RSS.
- Para evitar contenido engañoso, solo se muestran registros `verified=true` de localizaciones y vehículos.

## Seguridad
El control de acceso se realiza en Supabase mediante RLS, no solo ocultando el panel. No compartas secretos. Revisa el esquema en un proyecto de pruebas antes de exponerlo al público.

Proyecto independiente de fans. Sin afiliación con Rockstar Games o Take-Two. Utiliza contenido propio o con licencia.
