"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const ws_1 = require("ws");
const game_1 = require("../core/game");
const PORT = Number(process.env.PORT ?? 3001);
const DIST_DIR = node_path_1.default.resolve(__dirname, '../../dist');
const rooms = new Map();
const seatsByToken = new Map();
function send(socket, message) {
    if (socket.readyState === ws_1.WebSocket.OPEN)
        socket.send(JSON.stringify(message));
}
function newCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code;
    do {
        code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    } while (rooms.has(code));
    return code;
}
function broadcast(room) {
    const state = room.game.getState();
    for (const seat of room.seats) {
        if (seat.socket)
            send(seat.socket, { type: 'state', state });
    }
}
function announceOpponent(room) {
    for (const player of [0, 1]) {
        const seat = room.seats[player];
        if (seat.socket) {
            send(seat.socket, {
                type: 'opponent',
                connected: room.seats[player === 0 ? 1 : 0].socket !== null,
            });
        }
    }
}
function attach(room, player, socket, token, state) {
    const previous = room.seats[player].socket;
    if (previous && previous !== socket)
        previous.close();
    room.seats[player].socket = socket;
    room.seats[player].token = token;
    seatsByToken.set(token, { room, player });
    socket.room = room;
    socket.player = player;
    send(socket, { type: 'welcome', player, token, code: room.code, state });
    announceOpponent(room);
    if (state)
        broadcast(room);
}
function detach(socket) {
    const meta = socket;
    if (!meta.room || meta.player === undefined)
        return;
    const room = meta.room;
    room.seats[meta.player].socket = null;
    announceOpponent(room);
}
function handleMessage(socket, raw) {
    let message;
    try {
        message = JSON.parse(raw);
    }
    catch {
        send(socket, { type: 'error', message: 'Mensaje invalido' });
        return;
    }
    if (message.type === 'create') {
        detach(socket);
        const code = newCode();
        const room = {
            code,
            game: new game_1.TrucoGame(Date.now()),
            seats: [{ socket: null, token: '' }, { socket: null, token: '' }],
        };
        rooms.set(code, room);
        attach(room, 0, socket, (0, node_crypto_1.randomUUID)(), null);
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
        attach(room, 1, socket, (0, node_crypto_1.randomUUID)(), room.game.getState());
        return;
    }
    if (message.type === 'action') {
        const meta = socket;
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
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
function serveStatic(req, res) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = node_path_1.default.resolve(DIST_DIR, `.${node_path_1.default.normalize(requested)}`);
    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403).end('Forbidden');
        return;
    }
    const target = node_fs_1.default.existsSync(filePath) && node_fs_1.default.statSync(filePath).isFile() ? filePath : node_path_1.default.join(DIST_DIR, 'index.html');
    node_fs_1.default.readFile(target, (error, data) => {
        if (error) {
            res.writeHead(404).end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[node_path_1.default.extname(target)] ?? 'application/octet-stream' });
        res.end(data);
    });
}
const server = node_http_1.default.createServer(serveStatic);
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '/ws', 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) {
        const found = seatsByToken.get(token);
        if (found) {
            attach(found.room, found.player, socket, token, found.room.game.getState());
        }
        else {
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
