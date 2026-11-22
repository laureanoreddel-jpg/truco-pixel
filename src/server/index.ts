import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { TrucoGame } from '../core/game';
import type { GameAction, GameState, PlayerIndex } from '../core/types';

type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'action'; action: GameAction };

type ServerMessage =
  | { type: 'welcome'; player: PlayerIndex; token: string; code: string; state: GameState | null }
  | { type: 'state'; state: GameState }
  | { type: 'opponent'; connected: boolean }
  | { type: 'error'; message: string };

interface Seat {
  socket: WebSocket | null;
  token: string;
}

interface Room {
  code: string;
  game: TrucoGame;
  seats: [Seat, Seat];
}

const PORT = Number(process.env.PORT ?? 3001);
const DIST_DIR = path.resolve(__dirname, '../../dist');
const rooms = new Map<string, Room>();
const seatsByToken = new Map<string, { room: Room; player: PlayerIndex }>();

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function newCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function broadcast(room: Room): void {
  const state = room.game.getState();
  for (const seat of room.seats) {
    if (seat.socket) send(seat.socket, { type: 'state', state });
  }
}

function announceOpponent(room: Room): void {
  for (const player of [0, 1] as PlayerIndex[]) {
    const seat = room.seats[player];
    if (seat.socket) {
      send(seat.socket, {
        type: 'opponent',
        connected: room.seats[player === 0 ? 1 : 0].socket !== null,
      });
    }
  }
}

function attach(room: Room, player: PlayerIndex, socket: WebSocket, token: string, state: GameState | null): void {
  const previous = room.seats[player].socket;
  if (previous && previous !== socket) previous.close();
  room.seats[player].socket = socket;
  room.seats[player].token = token;
  seatsByToken.set(token, { room, player });
  (socket as WebSocket & { room?: Room; player?: PlayerIndex }).room = room;
  (socket as WebSocket & { room?: Room; player?: PlayerIndex }).player = player;
  send(socket, { type: 'welcome', player, token, code: room.code, state });
  announceOpponent(room);
  if (state) broadcast(room);
}

function detach(socket: WebSocket): void {
  const meta = socket as WebSocket & { room?: Room; player?: PlayerIndex };
  if (!meta.room || meta.player === undefined) return;
  const room = meta.room;
  room.seats[meta.player].socket = null;
  announceOpponent(room);
}

function handleMessage(socket: WebSocket, raw: string): void {
  let message: ClientMessage;
  try {
    message = JSON.parse(raw) as ClientMessage;
  } catch {
    send(socket, { type: 'error', message: 'Mensaje invalido' });
    return;
  }

  if (message.type === 'create') {
    detach(socket);
    const code = newCode();
    const room: Room = {
      code,
      game: new TrucoGame(Date.now()),
      seats: [{ socket: null, token: '' }, { socket: null, token: '' }],
    };
    rooms.set(code, room);
    attach(room, 0, socket, randomUUID(), null);
    return;
  }

  if (message.type === 'join') {
    const code = message.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      send(socket, { type: 'error', message: 'No existe esa sala' });
      return;
    }
    if (room.seats[1].socket || room.seats[1].token) {
      send(socket, { type: 'error', message: 'La sala esta llena' });
      return;
    }
    detach(socket);
    attach(room, 1, socket, randomUUID(), room.game.getState());
    return;
  }

  if (message.type === 'action') {
    const meta = socket as WebSocket & { room?: Room; player?: PlayerIndex };
    if (!meta.room || meta.player === undefined) {
      send(socket, { type: 'error', message: 'No estas en una sala' });
      return;
    }
    if (!meta.room.game.dispatch(meta.player, message.action)) {
      send(socket, { type: 'error', message: 'Jugada no permitida' });
      return;
    }
    broadcast(meta.room);
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(DIST_DIR, `.${path.normalize(requested)}`);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(DIST_DIR, 'index.html');
  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] ?? 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/ws', 'http://localhost');
  const token = url.searchParams.get('token');
  if (token) {
    const found = seatsByToken.get(token);
    if (found) {
      attach(found.room, found.player, socket, token, found.room.game.getState());
    } else {
      send(socket, { type: 'error', message: 'Sesion vencida, crea o une una sala' });
    }
  }
  socket.on('message', (data) => handleMessage(socket, String(data)));
  socket.on('close', () => detach(socket));
  socket.on('error', () => detach(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Truco Pixel: http://localhost:${PORT} (WebSocket en /ws)`);
});
