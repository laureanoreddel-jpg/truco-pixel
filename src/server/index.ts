/// <reference types="node" />
import { randomInt, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { TrucoGame } from '../core/game';
import { namesForViewer, type GameAction, type GameState, type PlayerIndex } from '../core/types';

/** Sin I/O (y sin 0/1) para evitar códigos ambiguos al leerlos en voz alta. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Seis letras: el espacio de 4 era adivinable probando códigos. */
export const ROOM_CODE_MIN_LENGTH = 6;
export const ROOM_CODE_MAX_LENGTH = 6;
export const MAX_PAYLOAD_BYTES = 8 * 1024;
export const MAX_MESSAGES_PER_SECOND = 30;
export const RATE_WINDOW_MS = 1_000;
export const ROOM_IDLE_MS = 30 * 60 * 1_000;
export const TOKEN_GRACE_MS = 5 * 60 * 1_000;
export const PRUNE_INTERVAL_MS = 60 * 1_000;
export const MAX_ROOMS = 500;
const DEFAULT_PORT = 3001;
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z]{6}$/;

export type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'action'; action: GameAction };

export type ServerMessage =
  | { type: 'welcome'; player: PlayerIndex; token: string; code: string; state: GameState | null }
  | { type: 'state'; state: GameState }
  | { type: 'opponent'; connected: boolean }
  | { type: 'error'; message: string };

export type ValidationResult =
  | { ok: true; message: ClientMessage }
  | { ok: false; error: string };

export interface Seat {
  socket: WebSocket | null;
  token: string;
  tokenExpiresAt: number;
}

export interface Room {
  code: string;
  game: TrucoGame;
  seats: [Seat, Seat];
  createdAt: number;
  lastActivity: number;
}

export interface TokenBinding {
  room: Room;
  player: PlayerIndex;
  expiresAt: number;
}

export interface PrunePolicy {
  roomIdleMs?: number;
}

export interface PruneResult {
  removed: string[];
  expiredSeats: number;
  expiredTokens: number;
}

export interface StartOptions {
  port?: number;
  host?: string;
  distDir?: string;
}

export interface ServerHandle {
  server: http.Server;
  wss: WebSocketServer;
  close(): Promise<void>;
}

export interface StaticFileResult {
  file: string;
  contentType: string;
  cacheControl: string;
}

type SocketMeta = { room?: Room; player?: PlayerIndex };
const DEFAULT_DIST_DIR = path.resolve(__dirname, '../../dist');
const ACTION_TYPES: ReadonlySet<string> = new Set<GameAction['type']>([
  'playCard',
  'callTruco',
  'acceptTruco',
  'raiseTruco',
  'declineTruco',
  'callEnvido',
  'callRealEnvido',
  'callEnvidoEnvido',
  'callFalta',
  'fold',
  'acceptEnvido',
  'declineEnvido',
  'nextHand',
  'restart',
]);

const rooms = new Map<string, Room>();
const tokens = new Map<string, TokenBinding>();

function logEvent(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function metaOf(socket: WebSocket): WebSocket & SocketMeta {
  return socket as WebSocket & SocketMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/** Código de 6 letras mayúsculas, sin caracteres ambiguos. */
export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_PATTERN.test(value);
}

/** Acepta minúsculas y espacios del cliente, devolviendo el código normalizado. */
export function normalizeRoomCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return isRoomCode(code) ? code : null;
}

/**
 * Genera un código único usando crypto. `taken` evita colisiones con salas vivas;
 * `randomIndex` es inyectable para poder testear el comportamiento determinísticamente.
 */
export function createRoomCode(
  taken: ReadonlySet<string> = new Set<string>(),
  length = ROOM_CODE_MIN_LENGTH,
  randomIndex: (max: number) => number = (max) => randomInt(max),
): string {
  let size = Math.min(ROOM_CODE_MAX_LENGTH, Math.max(ROOM_CODE_MIN_LENGTH, Math.floor(length)));
  for (let attempt = 0; attempt < 120; attempt++) {
    let code = '';
    for (let index = 0; index < size; index++) {
      const value = Math.abs(Math.floor(randomIndex(ROOM_CODE_ALPHABET.length))) % ROOM_CODE_ALPHABET.length;
      code += ROOM_CODE_ALPHABET[value];
    }
    if (!taken.has(code)) return code;
    // Si el espacio de 4 letras se agotó, crecemos hasta 6 antes de fallar.
    if (attempt > 0 && attempt % 16 === 0 && size < ROOM_CODE_MAX_LENGTH) size += 1;
  }
  throw new Error('No se pudo generar un código de sala único');
}

export function isToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

/** Valida la forma de una acción; la legalidad dentro de la partida la comprueba TrucoGame. */
export function isGameAction(value: unknown): value is GameAction {
  if (!isRecord(value) || typeof value.type !== 'string' || !ACTION_TYPES.has(value.type)) return false;
  if (value.type === 'playCard') {
    return (
      hasOnlyKeys(value, ['type', 'cardId']) &&
      typeof value.cardId === 'string' &&
      value.cardId.length > 0 &&
      value.cardId.length <= 64
    );
  }
  return hasOnlyKeys(value, ['type']);
}

/** Parseo y validación estricta de todo mensaje entrante. Nunca lanza. */
export function validateClientMessage(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') return { ok: false, error: 'Mensaje inválido: se esperaba texto JSON.' };
  if (Buffer.byteLength(raw, 'utf8') > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'Mensaje demasiado grande.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON inválido.' };
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return { ok: false, error: 'Mensaje inválido: se esperaba un objeto con tipo.' };
  }

  if (parsed.type === 'create') {
    if (!hasOnlyKeys(parsed, ['type'])) {
      return { ok: false, error: 'Mensaje inválido: create no acepta otros campos.' };
    }
    return { ok: true, message: { type: 'create' } };
  }

  if (parsed.type === 'join') {
    if (!hasOnlyKeys(parsed, ['type', 'code'])) {
      return { ok: false, error: 'Mensaje inválido: join requiere solamente code.' };
    }
    const code = normalizeRoomCode(parsed.code);
    if (!code) {
      return { ok: false, error: 'Código de sala inválido (6 letras, sin 0/O ni 1/I).' };
    }
    return { ok: true, message: { type: 'join', code } };
  }

  if (parsed.type === 'action') {
    if (!hasOnlyKeys(parsed, ['type', 'action']) || !isGameAction(parsed.action)) {
      return { ok: false, error: 'Jugada inválida.' };
    }
    return { ok: true, message: { type: 'action', action: parsed.action } };
  }

  return { ok: false, error: 'Tipo de mensaje desconocido.' };
}

/** Ventana deslizante de mensajes por conexión. */
export class RateLimiter {
  private readonly timestamps: number[] = [];
  private violations = 0;

  constructor(
    private readonly max = MAX_MESSAGES_PER_SECOND,
    private readonly windowMs = RATE_WINDOW_MS,
  ) {}

  allow(now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) this.timestamps.shift();
    if (this.timestamps.length >= this.max) {
      this.violations += 1;
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  get strikeCount(): number {
    return this.violations;
  }
}

/** Resuelve un path dentro de dist, rechazando traversal, backslashes y NUL. */
export function resolveStaticPath(pathname: string, distDir: string): string | null {
  if (typeof pathname !== 'string' || pathname.includes('\0')) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segments = decoded.split('/');
  if (segments.includes('..')) return null;

  const root = path.resolve(distDir);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

export function contentTypeFor(file: string): string {
  const extension = path.extname(file).toLowerCase();
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8',
  };
  return types[extension] ?? 'application/octet-stream';
}

/** Assets con hash se pueden cachear para siempre; el resto (y el HTML) no. */
export function cacheControlFor(file: string): string {
  const base = path.basename(file);
  if (path.extname(base).toLowerCase() === '.html' || base === 'manifest.webmanifest') {
    return 'no-cache';
  }
  const hashed = /(?:^|[-.])[a-z0-9]{8,}\.[^.]+$/i.test(base);
  return hashed ? 'public, max-age=31536000, immutable' : 'no-cache';
}

/** Busca el archivo pedido, con fallback a index.html para rutas SPA. */
export function resolveStaticFile(pathname: string, distDir = DEFAULT_DIST_DIR): StaticFileResult | null {
  const file = resolveStaticPath(pathname, distDir);
  if (!file) return null;
  let target = file;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    // Un archivo con extensión que no existe debe dar 404, no index.html.
    if (path.extname(file) !== '') return null;
    target = path.join(path.resolve(distDir), 'index.html');
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
  }
  return { file: target, contentType: contentTypeFor(target), cacheControl: cacheControlFor(target) };
}

export async function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  distDir = DEFAULT_DIST_DIR,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }
  let pathname: string;
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }
  const resolved = resolveStaticPath(pathname, distDir);
  if (!resolved) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let target = resolved;
  let stats = await fs.promises.stat(target).catch(() => null);
  if (!stats?.isFile()) {
    if (path.extname(resolved) !== '') {
      res.writeHead(404).end('Not found');
      return;
    }
    target = path.join(path.resolve(distDir), 'index.html');
    stats = await fs.promises.stat(target).catch(() => null);
    if (!stats?.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': contentTypeFor(target),
    'Cache-Control': cacheControlFor(target),
    'X-Content-Type-Options': 'nosniff',
  };
  if (req.method === 'HEAD') {
    res.writeHead(200, headers).end();
    return;
  }
  const stream = fs.createReadStream(target);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500).end('Error interno');
    else res.destroy();
  });
  res.writeHead(200, headers);
  stream.pipe(res);
}

function newSeat(): Seat {
  return { socket: null, token: '', tokenExpiresAt: 0 };
}

export function createRoom(code: string, options: { now?: number; seed?: number } = {}): Room {
  const now = options.now ?? Date.now();
  return {
    code,
    game: new TrucoGame(options.seed ?? Date.now()),
    seats: [newSeat(), newSeat()],
    createdAt: now,
    lastActivity: now,
  };
}

function touch(room: Room, now: number): void {
  room.lastActivity = now;
}

function clearSeat(room: Room, player: PlayerIndex, bindings: Map<string, TokenBinding>): void {
  const seat = room.seats[player];
  if (seat.token) bindings.delete(seat.token);
  room.seats[player] = newSeat();
}

function deleteRoom(room: Room, allRooms: Map<string, Room>, bindings: Map<string, TokenBinding>): void {
  allRooms.delete(room.code);
  for (const seat of room.seats) {
    if (seat.token) bindings.delete(seat.token);
    if (seat.socket) {
      const socket = seat.socket;
      const meta = metaOf(socket);
      meta.room = undefined;
      meta.player = undefined;
      // Avisar con un close explícito: sin él el cliente sigue en la mesa y
      // no dispara su flujo de reconexión / reapertura del menú online.
      if (typeof socket.close === 'function') socket.close(4001, 'Sala cerrada');
    }
  }
}

/** Un asiento desconectado sigue siendo recuperable mientras su token esté vivo. */
function recoverable(seat: Seat, now: number): boolean {
  return seat.socket !== null || (seat.token !== '' && seat.tokenExpiresAt > now);
}

/** Libera tokens vencidos de asientos desconectados. Devuelve cuántos se liberaron. */
export function expireDisconnectedTokens(
  room: Room,
  now: number,
  bindings: Map<string, TokenBinding>,
): number {
  let expired = 0;
  for (const player of [0, 1] as PlayerIndex[]) {
    const seat = room.seats[player];
    if (seat.socket === null && seat.token !== '' && seat.tokenExpiresAt <= now) {
      clearSeat(room, player, bindings);
      expired += 1;
    }
  }
  return expired;
}

/** Primer lugar libre para un nuevo jugador; respeta la gracia de reconexión. */
export function availableSeatForJoin(room: Room, now: number): PlayerIndex | null {
  for (const player of [0, 1] as PlayerIndex[]) {
    const seat = room.seats[player];
    if (seat.socket === null && (seat.token === '' || seat.tokenExpiresAt <= now)) return player;
  }
  return null;
}

/**
 * Poda salas huérfanas (sin sockets), inactivas y tokens vencidos de jugadores desconectados.
 * Mutables a propósito: el servidor usa estos mismos mapas.
 */
export function pruneRooms(
  allRooms: Map<string, Room>,
  now: number,
  bindings: Map<string, TokenBinding> = new Map<string, TokenBinding>(),
  policy: PrunePolicy = {},
): PruneResult {
  const roomIdleMs = policy.roomIdleMs ?? ROOM_IDLE_MS;
  const result: PruneResult = { removed: [], expiredSeats: 0, expiredTokens: 0 };

  for (const [code, room] of allRooms) {
    // Mientras el socket está abierto el token sigue vivo; la gracia aplica al desconectado.
    const tokensBefore = bindings.size;
    result.expiredSeats += expireDisconnectedTokens(room, now, bindings);
    result.expiredTokens += tokensBefore - bindings.size;

    const anyConnected = room.seats.some((seat) => seat.socket !== null);
    const anyRecoverable = room.seats.some((seat) => recoverable(seat, now));
    const idle = now - room.lastActivity > roomIdleMs;
    if ((!anyConnected && !anyRecoverable) || idle) {
      deleteRoom(room, allRooms, bindings);
      result.removed.push(code);
      logEvent(`Sala ${code} eliminada (${idle ? 'inactiva' : 'huérfana'})`);
    }
  }
  return result;
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Un socket que se cerró entre el check y el send no debe tumbar el servidor.
    }
  }
}

/**
 * Vista del estado para un jugador: la mano rival nunca viaja y el envido
 * resuelto sólo se revela al cerrar la mano (cuando el reglamento lo exige).
 */
export function clientStateFor(state: GameState, viewer: PlayerIndex): GameState {
  const copy = JSON.parse(JSON.stringify(state)) as GameState;
  const hands: [GameState['hands'][number], GameState['hands'][number]] = [[], []];
  hands[viewer] = state.hands[viewer].map((card) => ({ ...card }));
  copy.hands = hands;
  copy.handCounts = [state.hands[0].length, state.hands[1].length];

  const revealEnvido = copy.phase !== 'playing';
  if (!revealEnvido) {
    copy.envidoResult = null;
    if (copy.lastHand) copy.lastHand.envido = undefined;
  }
  const maskEnvido = (text: string): string =>
    revealEnvido ? text : text.replace(/Envido \d+(?: \([^)]*\))?/g, 'Envido resuelto');
  copy.lastEvent = namesForViewer(maskEnvido(copy.lastEvent), viewer);
  copy.log = copy.log.map((line) => namesForViewer(maskEnvido(line), viewer));
  return copy;
}

function broadcast(room: Room): void {
  const state = room.game.getState();
  for (const player of [0, 1] as PlayerIndex[]) {
    const seat = room.seats[player];
    if (seat.socket) send(seat.socket, { type: 'state', state: clientStateFor(state, player) });
  }
}

function announceOpponent(room: Room): void {
  for (const player of [0, 1] as PlayerIndex[]) {
    const seat = room.seats[player];
    if (seat.socket) {
      const rival = room.seats[player === 0 ? 1 : 0];
      send(seat.socket, { type: 'opponent', connected: rival.socket !== null });
    }
  }
}

function attach(
  room: Room,
  player: PlayerIndex,
  socket: WebSocket,
  token: string,
  state: GameState | null,
  now: number,
  bindings: Map<string, TokenBinding>,
): void {
  const seat = room.seats[player];
  const previous = seat.socket;
  if (previous && previous !== socket) {
    metaOf(previous).room = undefined;
    metaOf(previous).player = undefined;
    previous.close(1000, 'Sesión reemplazada');
  }
  if (seat.token && seat.token !== token) bindings.delete(seat.token);

  seat.socket = socket;
  seat.token = token;
  seat.tokenExpiresAt = now + TOKEN_GRACE_MS;
  bindings.set(token, { room, player, expiresAt: seat.tokenExpiresAt });

  const meta = metaOf(socket);
  meta.room = room;
  meta.player = player;
  touch(room, now);

  send(socket, {
    type: 'welcome',
    player,
    token,
    code: room.code,
    state: state ? clientStateFor(state, player) : null,
  });
  announceOpponent(room);
  if (state) broadcast(room);
}

/** Exportado para tests: desconecta un socket sin perder la gracia del token. */
export function detach(socket: WebSocket, now: number, allRooms: Map<string, Room>, bindings: Map<string, TokenBinding>): void {
  const meta = metaOf(socket);
  let room = meta.room;
  let player = meta.player;
  // Si el socket no trae metadata (tests o desconexión anticipada), lo buscamos por
  // identidad: así la gracia no depende de un WeakMap que pudo limpiarse antes.
  if (!room || player === undefined) {
    busca: for (const candidate of allRooms.values()) {
      for (const index of [0, 1] as PlayerIndex[]) {
        if (candidate.seats[index].socket === socket) {
          room = candidate;
          player = index;
          break busca;
        }
      }
    }
  }
  if (!room || player === undefined) return;
  meta.room = undefined;
  meta.player = undefined;

  if (room.seats[player].socket !== socket) return;
  const seat = room.seats[player];
  seat.socket = null;
  seat.tokenExpiresAt = now + TOKEN_GRACE_MS;
  // La reconexión valida contra el binding, no contra el asiento: ambas
  // expiraciones deben moverse juntas o la gracia se acorta tras una jugada.
  const binding = bindings.get(seat.token);
  if (binding) binding.expiresAt = seat.tokenExpiresAt;
  touch(room, now);
  announceOpponent(room);
  logEvent(`Sala ${room.code}: jugador ${player} desconectado`);

  // Mantener la sala si queda un token válido: caídas simultáneas (suspensión
  // del celular, deploy, cambio de red) no deben destruir la partida.
  const anyConnected = room.seats.some((candidate) => candidate.socket !== null);
  const anyRecoverable = room.seats.some((candidate) => recoverable(candidate, now));
  if (!anyConnected && !anyRecoverable) {
    deleteRoom(room, allRooms, bindings);
    logEvent(`Sala ${room.code} eliminada (ambos jugadores desconectados sin token vigente)`);
  }
}

function socketDataToString(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data) && data.every(Buffer.isBuffer)) return Buffer.concat(data).toString('utf8');
  return '';
}

function handleMessage(
  socket: WebSocket,
  raw: string,
  allRooms: Map<string, Room>,
  bindings: Map<string, TokenBinding>,
): void {
  const validation = validateClientMessage(raw);
  if (!validation.ok) {
    logEvent(`Mensaje rechazado: ${validation.error}`);
    send(socket, { type: 'error', message: validation.error });
    return;
  }

  const message = validation.message;
  const now = Date.now();

  if (message.type === 'create') {
    pruneRooms(allRooms, now, bindings);
    if (allRooms.size >= MAX_ROOMS) {
      send(socket, { type: 'error', message: 'El servidor está lleno, intentá más tarde.' });
      return;
    }
    detach(socket, now, allRooms, bindings);
    const code = createRoomCode(new Set(allRooms.keys()));
    const room = createRoom(code, { now });
    allRooms.set(code, room);
    attach(room, 0, socket, randomUUID(), null, now, bindings);
    logEvent(`Sala ${code} creada`);
    return;
  }

  if (message.type === 'join') {
    const room = allRooms.get(message.code);
    if (!room) {
      send(socket, { type: 'error', message: 'No existe esa sala.' });
      return;
    }
    expireDisconnectedTokens(room, now, bindings);
    const freeSeat = availableSeatForJoin(room, now);
    if (freeSeat === null) {
      send(socket, {
        type: 'error',
        message: 'La sala está llena o el lugar está reservado por unos minutos para reconectar.',
      });
      return;
    }
    detach(socket, now, allRooms, bindings);
    attach(room, freeSeat, socket, randomUUID(), room.game.getState(), now, bindings);
    logEvent(`Sala ${room.code}: jugador ${freeSeat} se unió`);
    return;
  }

  const meta = metaOf(socket);
  if (!meta.room || meta.player === undefined || meta.room.seats[meta.player].socket !== socket) {
    send(socket, { type: 'error', message: 'No estás en una sala.' });
    return;
  }
  const room = meta.room;
  const player = meta.player;
  // El estado es autoritativo: se puede seguir jugando con el rival ausente y
  // se le sincroniza todo al reconectar. Bloquear sólo congelaba la partida.
  if (!room.game.dispatch(player, message.action)) {
    send(socket, { type: 'error', message: 'Jugada no permitida.' });
    return;
  }
  touch(room, now);
  const seat = room.seats[player];
  seat.tokenExpiresAt = now + TOKEN_GRACE_MS;
  const binding = bindings.get(seat.token);
  if (binding) binding.expiresAt = seat.tokenExpiresAt;
  broadcast(room);
}

function handleConnection(
  socket: WebSocket,
  request: http.IncomingMessage,
  allRooms: Map<string, Room>,
  bindings: Map<string, TokenBinding>,
): void {
  const limiter = new RateLimiter();

  let url: URL;
  try {
    url = new URL(request.url ?? '/ws', 'http://localhost');
  } catch {
    send(socket, { type: 'error', message: 'Sesión inválida.' });
    return;
  }
  const rawToken = url.searchParams.get('token');
  if (rawToken !== null) {
    const now = Date.now();
    const binding = isToken(rawToken) ? bindings.get(rawToken) : undefined;
    const seat = binding?.room.seats[binding.player];
    if (
      !binding ||
      !allRooms.has(binding.room.code) ||
      !seat ||
      seat.token !== rawToken ||
      (seat.socket === null && binding.expiresAt <= now)
    ) {
      if (rawToken) bindings.delete(rawToken);
      send(socket, { type: 'error', message: 'Sesión vencida o inválida, creá o unite a una sala.' });
    } else {
      attach(binding.room, binding.player, socket, rawToken, binding.room.game.getState(), now, bindings);
      logEvent(`Sala ${binding.room.code}: jugador ${binding.player} reconectado`);
    }
  }

  socket.on('message', (data) => {
    if (!limiter.allow()) {
      send(socket, { type: 'error', message: 'Demasiados mensajes, esperá un segundo.' });
      if (limiter.strikeCount >= 5) socket.close(1008, 'Límite de mensajes superado');
      return;
    }
    handleMessage(socket, socketDataToString(data), allRooms, bindings);
  });
  socket.on('close', () => detach(socket, Date.now(), allRooms, bindings));
  socket.on('error', () => detach(socket, Date.now(), allRooms, bindings));
}

function readPort(value: string | undefined): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

/** Arranca HTTP + WebSocket. No se llama al importar el módulo (ver guardia al final). */
export function startServer(options: StartOptions = {}): ServerHandle {
  const port = options.port ?? readPort(process.env.PORT);
  const host = options.host ?? '0.0.0.0';
  const distDir = options.distDir ?? DEFAULT_DIST_DIR;

  const server = http.createServer((req, res) => {
    void serveStatic(req, res, distDir);
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_PAYLOAD_BYTES });

  wss.on('connection', (socket, request) => handleConnection(socket, request, rooms, tokens));
  server.on('error', (error) => logEvent(`Error del servidor HTTP: ${error.message}`));
  server.listen(port, host, () => {
    logEvent(`Servidor iniciado en http://localhost:${port} (WebSocket en /ws)`);
  });

  const cleanupTimer = setInterval(() => {
    const result = pruneRooms(rooms, Date.now(), tokens);
    if (result.removed.length > 0 || result.expiredTokens > 0) {
      logEvent(
        `Limpieza: ${result.removed.length} salas eliminadas, ${result.expiredTokens} tokens vencidos, ` +
          `${result.expiredSeats} asientos liberados`,
      );
    }
  }, PRUNE_INTERVAL_MS);
  cleanupTimer.unref();

  return {
    server,
    wss,
    close: async () => {
      clearInterval(cleanupTimer);
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rooms.clear();
      tokens.clear();
    },
  };
}

/** Se usa en la guardia: true sólo cuando Node ejecuta este archivo directamente. */
export function isMainModule(): boolean {
  return (
    typeof require === 'function' &&
    typeof module === 'object' &&
    module !== null &&
    require.main === module
  );
}

if (isMainModule()) startServer();
