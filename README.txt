VICE HUB 3.4 - IMÁGENES EDITORIALES

1. Subir media-v34.js y media-v34.css a la raíz de GitHub.
2. En index.html, en <head>, añadir:
   <link rel="stylesheet" href="./media-v34.css">
3. Justo después de <script src="./editorial-v33.js"></script>, añadir:
   <script src="./media-v34.js"></script>
4. Esperar despliegue de Vercel. Iniciar sesión como editor/admin y abrir Editorial.
5. Seleccionar noticia, URL de imagen autorizada, créditos/licencia y confirmar derechos.

NOTAS:
- Este módulo no descarga ni genera imágenes y no prueba por sí solo los derechos de uso.
- Las imágenes se enlazan desde su URL original. Verificar que el titular permite hotlinking.
- Se apoya en columnas image_url e image_credit ya usadas por el portal v3.
- Si Supabase deniega escritura, revisar RLS; nunca desactivar RLS.
- La mejora de fuentes RSS se abordará separadamente para no sustituir el motor AutoNews 3.2 sin pruebas.
