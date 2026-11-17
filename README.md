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

## Rutas de Londres

Web estática con dos rutas independientes: **Eternatus**, 173 paradas en `index.html`, y **Polvos Estelares**, 20 paradas en `polvos.html`. El selector permite cambiar entre ellas. Copia coordenadas con un botón, marca la visita y muestra la espera estimada hasta la siguiente parada.

La ruta de Polvos conserva el orden de los siete sets de PoGoQuest proporcionados por el usuario: 14 recompensas de 1.000 y seis de 1.500, **23.000 Polvos Estelares anunciados** en total, sin bonus. Son Polvos Estelares, no experiencia. Cada parada muestra su misión. El listado no incluye fecha de generación y las recompensas no se han verificado en el juego.

Cada ruta tiene una clave local y una colección de progreso propias. Cambiar, completar o reiniciar una no modifica la otra. Las copias de seguridad solo se pueden importar en la ruta correspondiente.

## Uso y progreso

- **Conectar con Google** activa la sincronización: usa la misma cuenta en el PC y en el iPhone. Firestore comunica las visitas, los cambios de «Deshacer» y el reinicio mientras la web está abierta; al volver a abrirla recupera los cambios.
- La primera conexión incorpora las marcas locales que no tengan una decisión previa en la nube. Las marcas anuladas en otro dispositivo se conservan como pendientes. Cambiar a otra cuenta carga su progreso separado.
- Cada cambio se guarda primero en localStorage. Sin conexión queda pendiente y se reintenta al volver. Se conserva al cerrar la página. Para usar la web por primera vez y para entrar con Google hace falta conexión.
- **Guardar copia** y **Recuperar copia** siguen disponibles como respaldo opcional. Borrar los datos del navegador antes de sincronizar elimina cambios pendientes; la navegación privada no garantiza conservarlos.
- El proyecto Firebase `pokehub-4f4a8` es independiente, con plan Spark. No usa servicios de ChatGPT ni proyectos del negocio. Solo se envían identificadores de parada, marcas y versiones; la cuenta se identifica mediante Firebase Authentication. No se envían coordenadas personales ni datos de Pokémon GO.
- **Deshacer** corrige una marca sin reiniciar la ruta.
- La clave de almacenamiento y los identificadores de paradas se mantienen estables para conservar el progreso al actualizar la web.

## Publicación en GitHub Pages

En Settings → Pages, selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)**. No necesita compilación ni servicios de ChatGPT. La ruta y la Pokédex siguen siendo estáticas; la sincronización usa Firebase Authentication y Cloud Firestore.

### Sincronización: mantenimiento y pruebas

`firebase-config.mjs` contiene la configuración web pública, no una credencial administrativa. Authentication debe tener Google habilitado y `joel1to96.github.io` autorizado. El SDK oficial 13.3.0 se carga desde gstatic. No se activa Analytics.

Publicar `firestore.rules` en la base `(default)` del proyecto indicado: acceso solo al UID autenticado por Google, rutas conocidas, paradas 1–173 para Eternatus y 1–20 para Polvos, y campos tipados. No abrir la base en modo de prueba. No hay permiso para eliminar documentos: «Deshacer» escribe una marca negativa versionada.

`sync-core.mjs` fusiona cambios por parada con un reloj lógico y un identificador aleatorio de dispositivo. Las decisiones concurrentes sobre una misma parada se resuelven de forma determinista; un cambio posterior que haya recibido el anterior lo reemplaza. `firebase-transport.mjs` aplica transacciones y escucha los cambios en directo. `sync.mjs` mantiene la cola local por cuenta, reconexión y estados de la interfaz. Cerrar sesión pausa los envíos y conserva los cambios para esa cuenta.

Pruebas: `node --test test-routes.mjs test-sync.mjs test-pokedex.mjs`. Cubren coordenadas, esperas y recompensas de la nueva ruta, conservación de la anterior, fusión entre dispositivos, reinicios, deshacer, reintentos, cambios simultáneos y recuperación después de cerrar. Los límites gratuitos se consultan en https://firebase.google.com/pricing; no cambiar a Blaze sin autorización.

## Archivos

- `index.html`: estructura de la interfaz.
- `polvos.html`: ruta independiente de Polvos Estelares.
- `style.css`: diseño adaptable a móviles.
- `app.js`: copiar, marcar, guardar y recuperar progreso.
- `route.js`: coordenadas y estimaciones de esta ruta.
- `route-polvos.js`: 20 coordenadas, misiones, recompensas y esperas de PoGoQuest.
- `.nojekyll`: sirve los archivos directamente.

Para comprobarla en local: `python -m http.server 8770` y abrir `http://127.0.0.1:8770/`.

## Datos de la ruta

Listado de TrainersGO proporcionado el 17/11/2026, con 173 paradas y tres excluidas. Las recompensas pueden cambiar y no se verifican en tiempo real. Las esperas indican el tramo hacia la siguiente parada de la lista, se cuentan desde la acción correspondiente en el juego y no garantizan evitar sanciones. Copiar una coordenada no confirma una visita dentro del juego.
