# Falta envido y Trucooo

Juego de **truco argentino** en 2D pixel art, 100% en TypeScript y Canvas, sin motores de juego.
Incluye **modo historia** de un jugador, partida rápida contra IA y modo multijugador online con salas.

**Jugá online:** https://truco-pixel.onrender.com

## Estado

- [x] Motor de reglas compartido (cliente y servidor)
- [x] Jerarquía real de cartas y regla de pardas del reglamento (empates)
- [x] IA con tres niveles de dificultad y decisión por simulación ligera (perfiles de campaña con personalidad propia)
- [x] Interfaz en primera persona 2D: mesa en perspectiva, rival sentado enfrente y cartas en profundidad
- [x] Pantalla de juego minimalista: puntajes, rondas como puntos, tooltips bajo demanda y sin paneles de texto
- [x] Tooltip con puesto en la jerarquía, envidio y comparación contra la carta del rival
- [x] Botones con los puntos exactos de cada canto y explicación al pasar el mouse
- [x] Ayuda por páginas (`H` + flechas) y tracker de rondas en pantalla (con detalle al señalarlo)
- [x] Tooltips bajo demanda para cada botón: explican puntos, rechazo y efecto del canto
- [x] Frases de los rivales de campaña al cantar, dibujadas como globos sobre la mesa
- [x] Interruptor de sonido y preferencias (dificultad y audio) guardadas localmente
- [x] Anuncios para lectores de pantalla mediante una región `aria-live`
- [x] Modo historia: 5 capítulos, rivales con personalidad, diálogos y progreso guardado
- [x] Modo 1 jugador vs IA (partida rápida con dificultad elegible)
- [x] Cadena completa de envido: envido → real → envido envido → falta, con prioridad sobre el truco e "irse al mazo"
- [x] El envidio del rival permanece oculto
- [x] Atajos de teclado para cartas y cantos (`1/2/3`, `E`, `R`, `F`, `T`, `S`, `N`, `M`, `Enter`)
- [x] Multijugador online con salas, códigos de 4–6 letras, reconexión por pestaña y servidor autoritativo blindado
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
- En online, creá una sala y compartí el código (4–6 letras), o unite con el código de otro jugador: escribilo dentro del canvas con letras A–Z, borrá con `Backspace` y confirmá con `Enter`.
- Pasá el mouse sobre una carta para ver su jerarquía, envido y comparación; hacé clic para jugarla.
- Señalá un botón de acción para leer su tooltip, o los puntitos de rondas para ver quién ganó cada una y quién es mano.
- El borde del marcador parpadea para indicar de quién es el turno. El botón `S` (o `SONIDO ON`) activa y desactiva el audio.
- Los botones de acción aparecen cuando es tu turno o cuando tenés que responder un canto.
- Al cerrar la mano, tocá **SIGUIENTE MANO** para seguir.

### Atajos

| Tecla | Acción |
| --- | --- |
| `1`, `2`, `3` | Jugar la carta 1, 2 o 3 |
| `E` | Envido / aceptar envido |
| `R` | Real envido |
| `D` | Envido envido |
| `F` | Falta envido |
| `T` | Truco / aceptar truco |
| `S` | Subir (retruco / vale cuatro) |
| `N` | No quiero |
| `M` | Irse al mazo |
| `Enter` | Siguiente mano / nueva partida |
| `H` | Ayuda (o volver desde la ayuda) |
| `Esc` | Menú / salir de la ayuda |
| `A–Z`, `Backspace`, `Enter` | Escribir, corregir y confirmar el código de sala |

## Reglas implementadas

Basadas en el reglamento del truco argentino (ASART y reglamentos públicos de torneos), sin flor ni contraflor. Fuentes consultadas: [trucoargentino.com.ar](https://trucoargentino.com.ar/reglas), [truco.ar](https://truco.ar/reglas), [Truco Wiki](https://truco.wiki), [trucoreal.com](https://trucoreal.com/reglas) y [TrucoBits](https://trucobits.com/blog/reglas-del-truco-argentino).

- Mazo de 40 cartas (1–7, 10, 11, 12 en cuatro palos), 3 cartas por jugador.
- **Jerarquía** (mayor a menor): 1 espada, 1 basto, 7 espada, 7 oro, 3, 2, 1 oro/copa, 12, 11, 10, 7 copa/basto, 6, 5, 4. Las cartas del mismo escalón empatan.
- Gana quien toma **2 de 3 rondas**. **Pardas**: si se empata la primera, decide la segunda; si se empata la segunda, gana quien ganó la primera; si se empata la tercera, vuelve a quien ganó la primera; con tres pardas gana el **mano**. El valor de la mano no se duplica por una parda.
- **Envido**: 20 + las dos cartas del mismo palo más altas; sin pareja, vale la carta mayor. Las figuras valen 0. El empate lo gana el mano.
- Solo se canta **antes de la primera carta**. Cadena: **envido +2 → real envido +3 → envido envido +4 → falta envido**. Se puede subir saltando escalones, pero no bajar ni repetir. La bolsa se acumula y se paga al cerrar la mano.
- **Falta envido**: vale lo que le falta **al rival** para llegar a 15 (no lo que te falta a vos); no se puede cantar empatados.
- Rechazar un canto da el escalón anterior: **1 / 2 / 3 / 4** puntos (envido / real / envido envido / falta). No cierra la mano.
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
tests/        tests del motor, la IA y el servidor con Vitest (60 pruebas)
```

El servidor es autoritativo en online: el cliente envía solo acciones y recibe el estado completo.

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
