# Falta envido y Trucooo

Juego de **truco argentino** en 2D pixel art, 100% en TypeScript y Canvas, sin motores de juego.
Incluye partida contra IA y modo multijugador online con salas.

**Jugá online:** https://truco-pixel.onrender.com

## Estado

- [x] Motor de reglas compartido (cliente y servidor)
- [x] Jerarquía real de cartas con empates y ronda doble por empate
- [x] IA con tres niveles de dificultad
- [x] Interfaz pixel art procedural (sin assets externos)
- [x] Modo 1 jugador vs IA
- [x] Envido → real envido → falta envido e "irse al mazo"
- [x] Pantalla de ayuda dentro del juego (`H`)
- [x] Atajos de teclado para cartas y cantos
- [x] Multijugador online con salas y reconexión
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

- Elegí **1 jugador** (contra IA) o **Multijugador**.
- En online, creá una sala y compartí el código de 4 letras, o unite con el código de otro jugador.
- Pasá el mouse sobre una carta para ver su nombre; hacé clic para jugarla.
- Los botones de acción aparecen cuando es tu turno o cuando tenés que responder un canto.
- Al cerrar la mano, tocá **SIGUIENTE MANO** para seguir.

### Atajos

| Tecla | Acción |
| --- | --- |
| `1`, `2`, `3` | Jugar la carta 1, 2 o 3 |
| `E` | Envido / aceptar envido |
| `R` | Real envido |
| `F` | Falta envido |
| `T` | Truco / aceptar truco |
| `S` | Subir (retruco / vale cuatro) |
| `N` | No quiero |
| `M` | Irse al mazo |
| `Enter` | Siguiente mano / nueva partida |
| `H` | Ayuda |
| `Esc` | Menú |

## Reglas implementadas

Basadas en el reglamento del truco argentino, sin flor ni contraflor.

- Mazo de 40 cartas (1–7, 10, 11, 12 en cuatro palos).
- **Jerarquía** (mayor a menor): 1 espada, 1 basto, 7 espada, 7 oro, 3, 2, 1 oro/copa, 12, 11, 10, 7 copa/basto, 6, 5, 4. Los cartas del mismo escalón empatan.
- Tres cartas por jugador; gana quien toma **2 de 3 rondas**. Si una ronda empata, la **siguiente vale doble** y eso define la mano.
- **Envidio**: 20 + las dos cartas del mismo palo más altas; sin pareja, vale la carta mayor. Las figuras valen 0.
- Apuestas antes de jugar la primera carta, en cadena: **envido +2 → real envido +3 → falta envido + lo que te falta para llegar a 15**. La bolsa se acumula y se paga a quien gana el envido al cerrar la mano.
- Rechazar: envido da 1 punto, real envido 2, falta envido los puntos cantados. No cierra la mano.
- **Truco → retruco → vale cuatro** (1/2/3 puntos). Rechazar entrega esos puntos a quien cantó y cierra la mano.
- **Irse al mazo**: en tu turno te rendís; el rival se lleva el valor del truco vigente.
- Gana quien llega a **15 puntos**.

## Estructura

```
src/core/     reglas, baraja, envido, IA (sin DOM)
src/client/   renderer pixel art, sprites procedurales, input, audio, red
src/server/   HTTP estático + WebSocket con salas autoritativas
tests/        tests del motor con Vitest
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
