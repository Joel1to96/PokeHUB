# PokeHUB · Parada Londres

Web estática para seguir una ruta de 173 paradas de Londres. Copia coordenadas con un botón, marca la visita y muestra la espera estimada hasta la siguiente parada.

## Uso y progreso

- El progreso se guarda automáticamente con localStorage en el mismo navegador y dispositivo, incluso al cerrar la página.
- **Guardar copia** descarga un archivo JSON. **Recuperar copia** permite llevarlo a otro dispositivo o recuperar una copia anterior; conserva también las visitas que ya estuvieran marcadas.
- El progreso no se sincroniza con la cuenta de GitHub ni se envía a ningún servidor. Borrar los datos del navegador o usar navegación privada puede eliminarlo: guarda una copia antes.
- **Deshacer** corrige una marca sin reiniciar la ruta.
- La clave de almacenamiento y los identificadores de paradas se mantienen estables para conservar el progreso al actualizar la web.

## Publicación en GitHub Pages

En Settings → Pages, selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)**. No necesita instalaciones, compilación, claves API ni servicios de ChatGPT.

## Archivos

- `index.html`: estructura de la interfaz.
- `style.css`: diseño adaptable a móviles.
- `app.js`: copiar, marcar, guardar y recuperar progreso.
- `route.js`: coordenadas y estimaciones de esta ruta.
- `.nojekyll`: sirve los archivos directamente.

Para comprobarla en local: `python -m http.server 8770` y abrir `http://127.0.0.1:8770/`.

## Datos de la ruta

Listado de TrainersGO proporcionado el 17/11/2026, con 173 paradas y tres excluidas. Las recompensas pueden cambiar y no se verifican en tiempo real. Las esperas indican el tramo hacia la siguiente parada de la lista, se cuentan desde la acción correspondiente en el juego y no garantizan evitar sanciones. Copiar una coordenada no confirma una visita dentro del juego.
