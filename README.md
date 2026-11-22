# Truco Pixel

Juego de **truco argentino simplificado** en 2D pixel art, 100% en TypeScript y Canvas.
Incluye partida contra IA y modo multijugador online con salas.

## Estado

- [x] Motor de reglas compartido (cliente y servidor)
- [x] IA con tres niveles de dificultad
- [x] Interfaz pixel art procedural (sin assets externos)
- [x] Modo 1 jugador vs IA
- [x] Envidio acumulativo (envido + real + falta) e "irse al mazo"
- [x] Pantalla de ayuda dentro del juego (`H`)
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
- Para jugar una carta, hacé clic en ella (pasá el mouse para ver su nombre). Los botones de acción aparecen cuando es tu turno.
- `H` abre la ayuda y `Esc` vuelve al menú.

## Reglas implementadas (simplificado)

- Mazo de 40 cartas (1–7, 10, 11, 12 en cuatro palos).
- Jerarquía: 1 espada → 1 basto → 7 espada → 7 oro → 1 oro → 7 copa → 7 basto → 6…2 → 1 copa → 12 → 11 → 10.
- Tres cartas por jugador; gana quien toma dos rondas. Si empatan las nuevas, gana el jugador "mano" (quien arrancó).
- Si una ronda empata, la siguiente vale doble.
- Envidio: 20 + las dos cartas del mismo palo más altas; sin pareja, vale la carta mayor. Las figuras valen 0.
- Apuestas de envido **acumulativas** antes de jugar la primera carta: **envido +2**, **real envido +3**, **falta envido + los puntos que te faltan para ganar**. La bolsa se muestra en pantalla y se paga a quien gana el envido al cerrar la mano.
- Rechazar una apuesta de envido da al que la cantó los puntos de la bolsa ya aceptada (mínimo 1).
- **Falta envido** solo se puede cantar si no estás empatado en el marcador.
- **Truco → retruco → vale cuatro**. Rechazar un truco termina la mano y da los puntos del último truco aceptado.
- **Irse al mazo**: en tu turno te rendís, termina la mano y el rival se lleva el valor del truco vigente.
- Puntos del truco: 1/2/3. Partida a 15.

No incluye flor ni contraflor (versión simplificada).

## Estructura

```
src/core/     reglas, baraja, envido, IA (sin DOM)
src/client/   renderer pixel art, sprites procedurales, input, audio, red
src/server/   HTTP estático + WebSocket con salas autoritativas
tests/        tests del motor con Vitest
```

El servidor es autoritativo en online: el cliente envía solo acciones y recibe el estado completo.

## Deploy paso a paso en Render (gratis)

1. Subí esta carpeta a un repositorio de GitHub (o GitLab).
2. Creá cuenta en https://render.com y entrá.
3. En el dashboard: **New + → Blueprint**.
4. Conectá el repositorio y elegí la rama (`main`).
5. Render detecta `render.yaml` automáticamente. Revisá el nombre del servicio (`truco-pixel`) y hacé clic en **Apply**.
6. Esperá el build (instala dependencias, corre `npm run build` dentro del Dockerfile y arranca el servidor).
7. Cuando diga **Live**, copiá la URL `https://truco-pixel.onrender.com` y compártila.

Si preferís hacerlo sin Blueprint: **New + → Web Service → Docker**, seleccioná el repo, dejá `Dockerfile` por defecto y el plan **Free**. No hace falta configurar `PORT`: Render lo inyecta y el servidor lo usa.

El WebSocket usa la misma URL que la página (`/ws`), así que funciona con HTTPS/WSS sin configuración extra.

### Probarlo local con Docker

```bash
docker build -t truco-pixel .
docker run -p 3001:3001 truco-pixel
```

Abrí http://localhost:3001. Para jugar en línea con amigos de otra red, usá la URL pública del servicio.
