# GTA 6 Hub · Publicación automática

Este paquete añade automatización al repositorio actual. NO sustituir `index.html`, `backend.js` ni `config.js`.

1. En Supabase > SQL Editor ejecutar `migration_autonews.sql` (una vez).
2. Copiar `package.json`, `scripts/publish-news.mjs`, `scripts/news-sources.mjs` y `.github/workflows/automatic-news.yml` a las rutas idénticas del repositorio GitHub.
3. No hace falta crear `package-lock.json`: el flujo instala las dependencias automáticamente.
4. En GitHub > Settings > Secrets and variables > Actions, crear tres Repository secrets:
   - `SUPABASE_URL`: URL del proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` secreta, obtenida en Supabase > Project Settings > API Keys. NUNCA ponerla en config.js ni en código público.
   - `OPENAI_API_KEY`: clave de API de OpenAI, distinta de la suscripción ChatGPT Plus.
5. En GitHub > Actions > GTA 6 Hub - Noticias automaticas > Run workflow, probar manualmente y revisar logs. Después corre cada hora aproximadamente (GitHub puede retrasar ejecuciones programadas).

El bot consulta medios de videojuegos en español e inglés, Bing News y publicaciones públicas de Bluesky. Comprueba la fecha de publicación de la fuente original y pide una cita del texto que permita fechar el hecho en el intervalo reciente. Excluye fuentes inaccesibles, hechos antiguos, recopilaciones y contenido sin fecha verificable. En Editorial se guardan las historias de jugadores para verificar el material y atribuirlo a su autor.

El bot limita la publicación automática a una noticia por ejecución y tres por día UTC. Realiza hasta tres llamadas de redacción por ejecución. Las traducciones se contabilizan por separado.

Para desactivar: GitHub > Actions > workflow > Disable workflow.
