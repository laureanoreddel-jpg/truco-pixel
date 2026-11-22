import { describe, expect, it, vi } from 'vitest';
import { TrucoGame } from '../src/core/game';
import {
  cacheControlFor,
  clientStateFor,
  contentTypeFor,
  createRoom,
  createRoomCode,
  isGameAction,
  isMainModule,
  isRoomCode,
  isToken,
  normalizeRoomCode,
  pruneRooms,
  RateLimiter,
  resolveStaticPath,
  validateClientMessage,
} from '../src/server/index';
import type { Room, TokenBinding } from '../src/server/index';

type Socket = Room['seats'][number]['socket'];
const fakeSocket = (): Socket => ({}) as Socket;

const VALID_UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('códigos de sala y tokens', () => {
  it('acepta sólo códigos de 6 letras sin caracteres ambiguos', () => {
    for (const code of ['ABCDEF', 'ABCDEFGHJKLMNPQRSTUV'.slice(0, 6)]) {
      expect(isRoomCode(code)).toBe(true);
    }
    for (const code of ['', 'ABCD', 'ABCDEFG', 'AB0DEF', 'ABODEF', 'AB1DEF', 'ABIDEF', 'ab-cde', 'AB CDE', 1234, null, {}]) {
      expect(isRoomCode(code)).toBe(false);
    }
    expect(normalizeRoomCode(' abcdef ')).toBe('ABCDEF');
    expect(normalizeRoomCode('AB0DEF')).toBeNull();
    expect(normalizeRoomCode(42)).toBeNull();
  });

  it('genera códigos únicos, válidos y respetando los ya ocupados', () => {
    const codes = Array.from({ length: 250 }, () => createRoomCode());
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(isRoomCode(code)).toBe(true);
      expect(/[01OI]/u.test(code)).toBe(false);
    }
    expect(createRoomCode(new Set(), 6, () => 0)).toBe('AAAAAA');
    // Si el código elegido está ocupado, prueba otra combinación antes de fallar.
    let index = 0;
    expect(createRoomCode(new Set(['ABCDEF']), 6, () => index++ % 24)).toBe('GHJKLM');
  });

  it('valida tokens con formato UUID v4', () => {
    expect(isToken(VALID_UUID)).toBe(true);
    expect(isToken('abc')).toBe(false);
    expect(isToken('')).toBe(false);
    expect(isToken(null)).toBe(false);
  });
});

describe('validación de mensajes', () => {
  it('acepta create, join y action bien formados', () => {
    expect(validateClientMessage('{"type":"create"}')).toEqual({ ok: true, message: { type: 'create' } });
    expect(validateClientMessage('{"type":"join","code":" abcdef "}')).toEqual({
      ok: true,
      message: { type: 'join', code: 'ABCDEF' },
    });
    expect(validateClientMessage('{"type":"action","action":{"type":"callTruco"}}')).toEqual({
      ok: true,
      message: { type: 'action', action: { type: 'callTruco' } },
    });
    expect(validateClientMessage('{"type":"action","action":{"type":"playCard","cardId":"1-espada"}}')).toEqual({
      ok: true,
      message: { type: 'action', action: { type: 'playCard', cardId: '1-espada' } },
    });
  });

  it('rechaza mensajes malformados sin lanzar', () => {
    const invalid: unknown[] = [
      undefined,
      null,
      {},
      '{',
      '[]',
      'null',
      '"create"',
      '{"code":"ABCD"}',
      '{"type":"create","extra":1}',
      '{"type":"join"}',
      '{"type":"join","code":1234}',
      '{"type":"join","code":"ABCD"}',
      '{"type":"join","code":"AB0DEF"}',
      '{"type":"join","code":"ABCD","extra":true}',
      '{"type":"action"}',
      '{"type":"action","action":null}',
      '{"type":"action","action":{"type":"unknown"}}',
      '{"type":"action","action":{"type":"playCard","cardId":7}}',
      '{"type":"action","action":{"type":"playCard"}}',
      '{"type":"action","action":{"type":"playCard","cardId":"x","extra":1}}',
      '{"type":"action","action":{"type":"callTruco","cardId":"x"}}',
      '{"type":"borrar"}',
      `{"type":"create","padding":"${'x'.repeat(9000)}"}`,
    ];
    for (const raw of invalid) {
      expect(() => validateClientMessage(raw)).not.toThrow();
      const result = validateClientMessage(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('isGameAction aplica la misma forma estricta', () => {
    expect(isGameAction({ type: 'fold' })).toBe(true);
    expect(isGameAction({ type: 'playCard', cardId: 'c1' })).toBe(true);
    expect(isGameAction({ type: 'playCard', cardId: '' })).toBe(false);
    expect(isGameAction({ type: 'fold', extra: 1 })).toBe(false);
    expect(isGameAction('fold')).toBe(false);
  });
});

describe('rate limit por conexión', () => {
  it('permite 30 mensajes por segundo y bloquea el resto de la ventana', () => {
    const limiter = new RateLimiter(30, 1000);
    for (let index = 0; index < 30; index++) expect(limiter.allow(10_000)).toBe(true);
    expect(limiter.allow(10_000)).toBe(false);
    expect(limiter.allow(10_999)).toBe(false);
    expect(limiter.strikeCount).toBe(2);
    expect(limiter.allow(11_000)).toBe(true);
  });
});

describe('poda de salas', () => {
  const setup = (now: number) => {
    const allRooms = new Map<string, Room>();
    const bindings = new Map<string, TokenBinding>();
    return { allRooms, bindings, now };
  };

  it('elimina salas inactivas aunque haya un socket conectado', () => {
    const { allRooms, bindings, now } = setup(1_000);
    const room = createRoom('ABCD', { now });
    room.seats[0].socket = fakeSocket();
    room.seats[0].token = VALID_UUID;
    room.seats[0].tokenExpiresAt = Number.MAX_SAFE_INTEGER;
    allRooms.set(room.code, room);
    bindings.set(VALID_UUID, { room, player: 0, expiresAt: room.seats[0].tokenExpiresAt });

    const result = pruneRooms(allRooms, now + 31 * 60_000, bindings);
    expect(result.removed).toEqual(['ABCD']);
    expect(allRooms.size).toBe(0);
    expect(bindings.size).toBe(0);
  });

  it('elimina salas huérfanas sin pies ni cabezas', () => {
    const { allRooms, bindings, now } = setup(1_000);
    const room = createRoom('EFGH', { now });
    allRooms.set(room.code, room);
    const result = pruneRooms(allRooms, now + 1, bindings);
    expect(result.removed).toEqual(['EFGH']);
    expect(allRooms.has('EFGH')).toBe(false);
  });

  it('libera el asiento y el token del desconectado vencido, pero conserva la sala', () => {
    const { allRooms, bindings, now } = setup(10_000);
    const room = createRoom('JKLM', { now });
    room.seats[0].token = VALID_UUID;
    room.seats[0].tokenExpiresAt = now - 1;
    room.seats[1].socket = fakeSocket();
    room.seats[1].token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    room.seats[1].tokenExpiresAt = now + 100_000;
    allRooms.set(room.code, room);
    bindings.set(VALID_UUID, { room, player: 0, expiresAt: room.seats[0].tokenExpiresAt });
    bindings.set(room.seats[1].token, { room, player: 1, expiresAt: room.seats[1].tokenExpiresAt });

    const result = pruneRooms(allRooms, now, bindings);
    expect(result.expiredSeats).toBe(1);
    expect(result.expiredTokens).toBe(1);
    expect(result.removed).toEqual([]);
    expect(allRooms.has('JKLM')).toBe(true);
    expect(room.seats[0].token).toBe('');
    expect(bindings.has(VALID_UUID)).toBe(false);
    expect(bindings.has(room.seats[1].token)).toBe(true);
  });

  it('no vence el token de quien sigue conectado', () => {
    const { allRooms, bindings, now } = setup(10_000);
    const room = createRoom('PQRS', { now });
    room.seats[0].socket = fakeSocket();
    room.seats[0].token = VALID_UUID;
    room.seats[0].tokenExpiresAt = now - 1;
    room.seats[1].socket = fakeSocket();
    allRooms.set(room.code, room);
    bindings.set(VALID_UUID, { room, player: 0, expiresAt: room.seats[0].tokenExpiresAt });

    const result = pruneRooms(allRooms, now, bindings);
    expect(result.removed).toEqual([]);
    expect(result.expiredSeats).toBe(0);
    expect(bindings.has(VALID_UUID)).toBe(true);
  });

  it('respeta una política personalizada para tests', () => {
    const { allRooms, bindings, now } = setup(0);
    const room = createRoom('QRST', { now });
    room.seats[0].socket = fakeSocket();
    allRooms.set(room.code, room);

    expect(pruneRooms(allRooms, now + 1_001, bindings, { roomIdleMs: 1_000 }).removed).toEqual(['QRST']);
  });
});

describe('vista privada del estado online', () => {
  const card = (rank: 1 | 7 | 6, suit: 'oro' | 'espada') => ({ id: `${rank}-${suit}`, rank, suit });

  it('nunca envía la mano del rival ni sus cartas ocultas', () => {
    const game = new TrucoGame(7);
    game.state.hands = [
      [card(7, 'oro'), card(6, 'oro'), card(1, 'espada')],
      [card(7, 'espada'), card(6, 'espada'), card(1, 'oro')],
    ];
    const state = game.getState();
    for (const viewer of [0, 1] as const) {
      const view = clientStateFor(state, viewer);
      expect(view.hands[viewer]).toEqual(state.hands[viewer]);
      expect(view.hands[viewer === 0 ? 1 : 0]).toEqual([]);
      expect(view.handCounts).toEqual([3, 3]);
      if (viewer === 0) expect(JSON.stringify(view)).not.toContain('6-espada');
      else expect(JSON.stringify(view)).toContain('6-espada');
    }
  });

  it('oculta el envido resuelto hasta el cierre de la mano y usa nombres relativos', () => {
    const game = new TrucoGame(9);
    game.state.hands = [
      [card(7, 'oro'), card(6, 'oro'), card(1, 'espada')],
      [card(7, 'espada'), card(6, 'espada'), card(1, 'oro')],
    ];
    game.dispatch(0, { type: 'callEnvido' });
    game.dispatch(1, { type: 'acceptEnvido' });
    game.dispatch(0, { type: 'playCard', cardId: card(1, 'espada').id });
    game.dispatch(1, { type: 'playCard', cardId: card(7, 'espada').id });
    const playing = clientStateFor(game.getState(), 1);
    expect(playing.envidoResult).toBeNull();
    expect(playing.lastEvent).not.toContain('33');
    expect(playing.log.join(' ')).toContain('Vos');

    const closed = game.getState();
    closed.phase = 'handEnd';
    expect(clientStateFor(closed, 1).envidoResult?.score).toBe(33);
  });
});

describe('archivos estáticos', () => {
  it('bloquea traversal, backslashes, NUL y paths mal codificados', () => {
    const root = 'C:/juego/dist';
    expect(resolveStaticPath('/index.html', root)).toBeTruthy();
    expect(resolveStaticPath('/../../secreto.txt', root)).toBeNull();
    expect(resolveStaticPath('/%2e%2e/%2e%2e/secreto.txt', root)).toBeNull();
    expect(resolveStaticPath('/..\\secreto.txt', root)).toBeNull();
    expect(resolveStaticPath('/archivo%00.png', root)).toBeNull();
    expect(resolveStaticPath('/%ZZ', root)).toBeNull();
  });

  it('elige MIME y cache según el tipo de archivo', () => {
    expect(contentTypeFor('main.js')).toContain('javascript');
    expect(contentTypeFor('style.css')).toContain('text/css');
    expect(contentTypeFor('unknown.bin')).toBe('application/octet-stream');
    expect(cacheControlFor('index.html')).toBe('no-cache');
    expect(cacheControlFor('assets/main.js')).toBe('no-cache');
    expect(cacheControlFor('assets/index-abc12345.js')).toBe('public, max-age=31536000, immutable');
  });
});

describe('arranque del módulo', () => {
  it('no escucha ni arranca el servidor al importarlo desde un test', async () => {
    expect(isMainModule()).toBe(false);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      vi.resetModules();
      await import('../src/server/index');
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Servidor iniciado'));
    } finally {
      log.mockRestore();
    }
  });
});
