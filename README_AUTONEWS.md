# GTA 6 Hub · Publicación automática

Este paquete añade automatización al repositorio actual. NO sustituir `index.html`, `backend.js` ni `config.js`.

1. En Supabase > SQL Editor ejecutar `migration_autonews.sql` (una vez).
2. Copiar `package.json`, `scripts/publish-news.mjs` y `.github/workflows/automatic-news.yml` a las rutas idénticas del repositorio GitHub.
3. No hace falta crear `package-lock.json`: el flujo instala las dependencias automáticamente.
4. En GitHub > Settings > Secrets and variables > Actions, crear tres Repository secrets:
   - `SUPABASE_URL`: URL del proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` secreta, obtenida en Supabase > Project Settings > API Keys. NUNCA ponerla en config.js ni en código público.
   - `OPENAI_API_KEY`: clave de API de OpenAI, distinta de la suscripción ChatGPT Plus.
5. En GitHub > Actions > GTA 6 Hub - Noticias automaticas > Run workflow, probar manualmente y revisar logs. Después corre cada hora aproximadamente (GitHub puede retrasar ejecuciones programadas).

No incorpora todavía un límite monetario estricto de API; configura alertas y límites de gasto en el proveedor. Limita las llamadas de IA a dos por ejecución.

El bot consulta RSS de Google News, filtra entradas recientes, evita duplicados por URL, pide a la IA una noticia original basada únicamente en el titular y extracto, y publica un máximo de una noticia por ejecución y tres por día UTC. Si no hay datos suficientes, no publica. Las entradas agregadas no equivalen a comunicados oficiales; se atribuye la fuente y se guarda la URL. Verificar derechos de uso y calidad de los feeds antes de uso comercial. No hay garantías de que Google News RSS esté siempre disponible. El bot no consulta ni comprueba el contenido completo de los artículos enlazados.

Para desactivar: GitHub > Actions > workflow > Disable workflow.
