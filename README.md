# PokeHUB · Ruta y Pokédex de Pokémon GO

Web: https://joel1to96.github.io/PokeHUB/

## Pokédex

`pokedex.html` añade búsqueda por nombre, número y tipo, selección de formas e ilustraciones reales del archivo oficial-artwork de PokéAPI. Incluye 954 especies y 1.138 formas publicadas según la instantánea de PvPoke del 17/11/2026.

Calcula PC, PS, ataque y defensa por nivel (1–50, medios niveles, +1 de Mejor compañero) e IV (0–15). Los ataques distinguen acceso normal, MT élite/evento, legado sin MT élite y cambio de forma. Se separan estadísticas PvE y PvP; las duraciones/turnos y ratios de potencia nunca se presentan como daño real.

El módulo Max permite comparar Dinamax/Gigamax, niveles entrenados 1–3 y nivel 4 temporal por Cañón Dinamax, STAB, escudos y curación. Eternatus y las formas supremas de Zacian/Zamazenta tienen tratamiento propio. El catálogo de compatibilidades es conservador y parcial, con fuentes oficiales por familia en `max-data.json`; no confundir especies programadas con disponibles.

### Fuentes y mantenimiento

Esto no es una API oficial de Scopely. PvPoke aporta datos de Pokémon GO, repertorios y PvP (17/11/2026); PokeMiners aporta un espejo del Game Master para PvE (28/08/2026). Las cifras Max proceden de investigación comunitaria original enlazada en la interfaz. PokéAPI solo aporta nombres e identificadores de ilustraciones, nunca estadísticas de los juegos principales. Las reglas oficiales se enlazan por separado. Las ilustraciones se cargan desde el repositorio de PokéAPI; requieren conexión.

Para reconstruir los datos: `python sync-pokedex.py --refresh`. El script valida referencias de movimientos y conserva la fecha original de cada fuente; no convierte la fecha de descarga en fecha de actualización. Revisar manualmente las compatibilidades y fuentes de `max-data.json` ante nuevos eventos.

Pruebas de cálculo: `node --test test-pokedex.mjs`. Los datos de PvPoke están bajo la licencia incluida en `PVPoke-LICENSE.txt`. Las imágenes pertenecen a sus titulares Pokémon/Nintendo/Creatures/GAME FREAK.

Los ajustes de la Pokédex usan `pokehub:pokedex:v1`, independiente de la clave existente de progreso de la ruta. Actualizar este módulo no reinicia las paradas.

## Ruta de Londres

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
