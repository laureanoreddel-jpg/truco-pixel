# Falta envido y Trucooo

Juego de **truco argentino** en 2D pixel art, 100% en TypeScript y Canvas, sin motores de juego.
Incluye **modo historia** de un jugador, partida rápida contra IA y modo multijugador online con salas.

**Jugá online:** https://truco-pixel.onrender.com

## Estado

- [x] Motor de reglas compartido (cliente y servidor)
- [x] Jerarquía real de cartas y regla de pardas del reglamento (empates)
- [x] IA con tres niveles de dificultad y decisión por simulación ligera (perfiles de campaña con personalidad propia)
- [x] Interfaz en primera persona 2D: mesa en perspectiva, rival sentado enfrente y cartas en profundidad
- [x] Estética arcade de alto contraste: fondo casi negro, cartas crema y botones rojos/ámbar/verdes con borde negro y bisel
- [x] Dock de acciones con submenú de ENVIDO: envido, envido envido, real envido y falta; `QUIERO` y `NO QUIERO` quedan siempre en el dock con la bolsa exacta
- [x] Pantalla de juego minimalista: puntajes, rondas con color **y letra** (`G`/`P`/`=`), tooltips bajo demanda y sin paneles de texto
- [x] Tooltip con puesto en la jerarquía, envido y comparación contra la carta del rival
- [x] Botones agrupados en una barra, con los puntos exactos de cada canto y explicación al señalarlos
- [x] Ayuda por páginas (`H` + flechas) y tracker de rondas en pantalla (con detalle al señalarlo)
- [x] Las cartas jugadas se ven grandes y con etiqueta (`RIVAL R1`, `VOS R1`), con las rondas cerradas apiladas y numeradas a los costados
- [x] Indicador explícito de ronda (`RONDA 1/3`) y pausa con el resultado de cada ronda
- [x] Rival visible durante toda la mano: sprite animado con expresiones, gestos y rasgos propios por personaje
- [x] Cartas con palitos, filetes, brillo animado y contraste alto; resumen de mano con envido y truco separados, tantos y cartas del ganador del envido
- [x] El resumen y el final de partida se dibujan abajo para no tapar la última carta jugada
- [x] Tooltips bajo demanda para cada botón: explican puntos, rechazo y efecto del canto
- [x] Frases de los rivales de campaña al cantar, dibujadas como globos sobre la mesa
- [x] Interruptor de sonido y preferencias (dificultad y audio) guardadas localmente
- [x] Anuncios para lectores de pantalla mediante una región `aria-live`
- [x] Modo historia: 5 capítulos, rivales con personalidad, diálogos y progreso guardado
- [x] Modo 1 jugador vs IA (partida rápida con dificultad elegible)
- [x] Cadena de envido según el reglamento: envido → envido envido → real envido → falta, con prioridad sobre el truco e "irse al mazo"
- [x] El envido del rival permanece oculto hasta el cierre de la mano
- [x] Atajos de teclado para cartas y cantos (`1/2/3`, `E`, `Q`, `R`, `D`, `F`, `T`, `S`, `N`, `M`, `Enter`)
- [x] Multijugador online con salas de 6 letras, enlace de invitación `?sala=CODIGO`, campo de texto real en celular, aviso de rival desconectado, confirmación al salir, reconexión por pestaña y servidor autoritativo
- [x] Gracia de reconexión de 5 minutos incluso si caen ambos jugadores; se puede seguir jugando con el rival desconectado y se le sincroniza el estado al volver; la sesión vencida devuelve al menú online sin trabar el WebSocket
- [x] Cada jugador recibe una vista privada del estado: el servidor nunca envía la mano del rival ni el resultado del envido antes del cierre
- [x] Sonido chiptune generado con WebAudio
- [x] Build y deploy en un solo proceso

## Requisitos

Node.js 20 o superior (probado con Node 24).

## Ejecutar

```bash
npm install
```

### Desarrollo

Terminal 1 (cliente, http://localhost:5173):

```bash
npm run dev
```

Terminal 2 (servidor de salas, puerto 3001):

```bash
npm run dev:server
```

Vite redirige `/ws` al servidor, así que el modo online funciona también en desarrollo.

### Producción (local)

```bash
npm run build
npm start
```

Abrir http://localhost:3001. El mismo proceso sirve el cliente y el WebSocket.

### Tests

```bash
npm test
npm run typecheck
```

## Cómo jugar

- Elegí **Modo historia** (campaña de 5 rivales), **1 jugador** (partida rápida contra IA) o **Multijugador**.
- En el modo historia, ganás para desbloquear el capítulo siguiente. El progreso queda guardado en el navegador.
- En online, creá una sala y compartí el **enlace de invitación** (botón **COPIAR INVITACION**) o el código de 6 letras. En el celular, tocá **UNIRME** para abrir el teclado y escribir el código; en escritorio también podés usar `A–Z`, `Backspace` y `Enter`.
- Pasá el mouse sobre una carta para ver su jerarquía, envido y comparación; hacé clic para jugarla.
- Señalá un botón de acción para leer su tooltip, o los puntitos de rondas para ver quién ganó cada una y quién es mano.
- El borde del marcador parpadea para indicar de quién es el turno. El botón `S` (o `SONIDO ON`) activa y desactiva el audio.
- Los botones de acción aparecen cuando es tu turno o cuando tenés que responder un canto.
- Al cerrar la mano, tocá **SIGUIENTE MANO** para seguir.

### Atajos

| Tecla | Acción |
| --- | --- |
| `1`, `2`, `3` | Jugar la carta 1, 2 o 3 |
| `E` | Cantar envido / responder con el segundo envido |
| `Q` | Quiero (aceptar envido o truco) |
| `R` | Real envido |
| `D` | Segundo envido (`envido envido`) |
| `F` | Falta envido |
| `T` | Truco / aceptar truco |
| `S` | Subir (retruco / vale cuatro) |
| `N` | No quiero |
| `M` | Irse al mazo |
| `Enter` | Siguiente mano / nueva partida |
| `H` | Ayuda (o volver desde la ayuda) |
| `Esc` | Menú / salir de la ayuda |
| `A–Z`, `Backspace`, `Enter` | Escribir, corregir y confirmar el código de sala (en el campo HTML) |

## Reglas implementadas

Basadas en el reglamento del truco argentino (ASART y reglamentos públicos de torneos), sin flor ni contraflor. Fuentes consultadas: [reglamento del Encuentro Nacional de Empleados de Rentas (ARCAT)](https://dgrentas.arcat.gob.ar/olimpiadas/reglamentos/truco.pdf), [Reglamento de Truco — Juegos de Salón](https://www.folkloretradiciones.com.ar/reglamento%20truco.pdf), [anota.com.ar](https://www.anota.com.ar/reglamentos/truco), [trucoargentino.com.ar](https://trucoargentino.com.ar/reglas), [truco.ar](https://truco.ar/reglas) y [TrucoBits](https://trucobits.com/blog/dudas-reglas-truco).

- Mazo de 40 cartas (1–7, 10, 11, 12 en cuatro palos), 3 cartas por jugador.
- **Jerarquía** (mayor a menor): 1 espada, 1 basto, 7 espada, 7 oro, 3, 2, 1 oro/copa, 12, 11, 10, 7 copa/basto, 6, 5, 4. Las cartas del mismo escalón empatan.
- Gana quien toma **2 de 3 rondas**. **Pardas**: si se empata la primera, decide la segunda; si se empata la segunda, gana quien ganó la primera; si se empata la tercera, vuelve a quien ganó la primera; con tres pardas gana el **mano**. El valor de la mano no se duplica por una parda.
- **Envido**: 20 + las dos cartas del mismo palo más altas; sin pareja, vale la carta mayor. Las figuras valen 0. El empate lo gana el mano.
- **Iniciar** un envido se puede hasta que quien canta tira su primera carta (el pie puede cantar después de que tiró el mano) y nunca después de haber querido el truco. **Responder** un envido ajeno sí se puede aunque ya se haya tirado la primera carta: el reglamento dice que los rivales pueden contestar «aunque ya hayan jugado su primera carta».
- Cadena: **envido +2 → envido envido +2 (4 en total) → real envido +3 (7) → falta**. «Envido envido» es la respuesta «envido» a un envido: **un solo canto**, no una opción adicional. Según ARCAT/CASI, después de **envido o real envido** se pueden dar las cinco respuestas (quiero, envido, real, falta, no quiero); el segundo «envido» es único, así que tras envido envido (o tras un segundo envido cualquiera) quedan real y falta. No se puede bajar ni cantar más después de querer.
- Cada palabra «envido» suma 2 a los **tantos en juego**; el real suma 3. Se pagan al cerrar la mano y no cortan el juego.
- **Falta envido**: reemplaza todos los tantos en juego y vale lo que le falta **a quien va ganando** para llegar a 15. Con empate, valen 15 para ambos.
- Rechazar un canto da el valor de la cadena **sin el último canto** (o **1** si era el primero). Ejemplos: real directo rechazado = 1; envido + envido rechazado = 2; envido + real rechazado = 2; real + envido rechazado = 3; envido + envido + real rechazado = 4; real + envido + envido rechazado = 5. No cierra la mano.
- Quien gana el envido canta sus tantos y muestra sus cartas al final de la mano; antes de eso el rival no ve ni el resultado ni las cartas.
- Si te cantan truco antes de tirar la primera carta, podés responder **envido va primero**: se resuelve el envido y después vuelve el truco pendiente.
- **Truco → retruco → vale cuatro**: la mano vale **2 / 3 / 4** puntos. Rechazar da **1 / 2 / 3** a quien cantó y cierra la mano. Quien recibió el canto puede subir incluso después de aceptar.
- **Irse al mazo**: el rival se lleva el valor del truco vigente; si es antes de cerrar el turno del envido, suma 1 punto extra.
- Gana quien llega a **15 puntos**. En 1 vs 1 el rol de **mano** (quien tira primero y gana los empates) alterna en cada reparto.

No se implementan la **flor**, la **contraflor** ni el **vale juego**, que son variantes opcionales de algunas mesas.

## Estructura

```
src/core/     reglas, baraja, envido, IA, campaña (sin DOM)
src/client/   renderer pixel art, sprites procedurales, input, audio, red
src/server/   HTTP estático + WebSocket con salas autoritativas
tests/        tests del motor, la IA y el servidor con Vitest (80 pruebas)
```

El servidor es autoritativo en online: el cliente envía solo acciones y recibe una **vista privada** del estado (sin la mano del rival ni el envido sin resolver).

## Deploy en Render

El repo tiene `Dockerfile` y `render.yaml`; Render hace auto-deploy de cada push a `main`.

Si preferís hacerlo a mano: **New + → Web Service → Docker**, conectá el repo, dejá el `Dockerfile` por defecto y elegí plan **Free**. No hace falta configurar `PORT`: Render lo inyecta y el servidor lo usa.

El WebSocket usa la misma URL que la página (`/ws`), así que funciona con HTTPS/WSS sin configuración extra.

### Probarlo local con Docker

```bash
docker build -t truco-pixel .
docker run -p 3001:3001 truco-pixel
```

Abrí http://localhost:3001. Para jugar en línea con amigos de otra red, usá la URL pública del servicio.
