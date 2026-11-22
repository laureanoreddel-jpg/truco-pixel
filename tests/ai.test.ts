import { describe, expect, it } from 'vitest';
import {
  AI_PROFILES,
  chooseAiAction,
  makeStoryProfile,
  profileFor,
  type AiProfile,
  type Difficulty,
} from '../src/core/ai';
import { mulberry32 } from '../src/core/deck';
import { TrucoGame } from '../src/core/game';
import type { Card, GameAction, PlayerIndex, Rank, Suit } from '../src/core/types';

const card = (rank: Rank, suit: Suit): Card => ({ id: `${rank}-${suit}`, rank, suit });

const ENVIDO_CALLS: GameAction['type'][] = [
  'callEnvido',
  'callRealEnvido',
  'callEnvidoEnvido',
  'callFalta',
];

function setup(hands: [Card[], Card[]], mano: PlayerIndex = 0): TrucoGame {
  const game = new TrucoGame(123);
  game.state.hands = [hands[0].slice(), hands[1].slice()];
  game.state.mano = mano;
  game.state.turn = mano;
  return game;
}

function isLegal(legal: GameAction[], action: GameAction): boolean {
  return legal.some(
    (candidate) =>
      candidate.type === action.type &&
      (candidate.type !== 'playCard' ||
        action.type !== 'playCard' ||
        candidate.cardId === action.cardId),
  );
}

/** Juega una partida completa; devuelve el ganador y valida cada decisión de la IA. */
function playMatch(
  seed: number,
  levels: [Difficulty | AiProfile, Difficulty | AiProfile],
): PlayerIndex {
  const game = new TrucoGame(seed * 7919);
  let step = 0;
  while (game.state.phase !== 'gameEnd' && step < 3000) {
    const state = game.state;
    const player: PlayerIndex = state.pending
      ? state.pending.by === 0
        ? 1
        : 0
      : state.phase === 'handEnd'
        ? 0
        : state.turn;
    const legal = game.legalActions(player);
    const rng = mulberry32(seed * 1000003 + step * 97 + player);
    const action = chooseAiAction(game, player, levels[player], rng);

    expect(legal.length).toBeGreaterThan(0);
    expect(isLegal(legal, action)).toBe(true);
    expect(game.dispatch(player, action)).toBe(true);
    step++;
  }
  expect(game.state.phase).toBe('gameEnd');
  expect(game.state.winner).not.toBeNull();
  return game.state.winner as PlayerIndex;
}

describe('perfiles de IA', () => {
  it('los tres perfiles son distintos y están en rangos interpretables', () => {
    const { facil, medio, dificil } = AI_PROFILES;
    expect(facil.bluff).toBeGreaterThan(medio.bluff);
    expect(medio.bluff).toBeGreaterThan(dificil.bluff);
    expect(facil.foldTolerance).toBeGreaterThan(medio.foldTolerance);
    expect(medio.foldTolerance).toBeGreaterThan(dificil.foldTolerance);
    expect(facil.envidoBias).toBeLessThan(medio.envidoBias);
    expect(medio.envidoBias).toBeLessThan(dificil.envidoBias);
    expect(facil.samples).toBeLessThan(medio.samples);
    expect(medio.samples).toBeLessThan(dificil.samples);
    expect(facil.noise).toBeGreaterThan(medio.noise);
    expect(medio.noise).toBeGreaterThan(dificil.noise);
    for (const profile of [facil, medio, dificil]) {
      expect(profile.bluff).toBeGreaterThanOrEqual(0);
      expect(profile.bluff).toBeLessThanOrEqual(1);
      expect(profile.envidoBias).toBeGreaterThanOrEqual(-1);
      expect(profile.envidoBias).toBeLessThanOrEqual(1);
      expect(profile.foldTolerance).toBeGreaterThanOrEqual(0);
      expect(profile.foldTolerance).toBeLessThanOrEqual(1);
      expect(profile.samples).toBeGreaterThanOrEqual(3);
      expect(profile.label.length).toBeGreaterThan(0);
    }
    expect(facil.samples).toBeGreaterThanOrEqual(3);
    expect(facil.samples).toBeLessThanOrEqual(8);
    expect(medio.samples).toBeGreaterThanOrEqual(8);
    expect(medio.samples).toBeLessThanOrEqual(15);
    expect(dificil.samples).toBeGreaterThanOrEqual(20);
    expect(dificil.samples).toBeLessThanOrEqual(40);
  });

  it('profileFor devuelve una copia y makeStoryProfile aplica overrides sin mutar el original', () => {
    const copy = profileFor('medio');
    expect(copy).toEqual(AI_PROFILES.medio);
    expect(copy).not.toBe(AI_PROFILES.medio);
    copy.bluff = 0.99;
    expect(AI_PROFILES.medio.bluff).not.toBe(0.99);

    const original = AI_PROFILES.medio.samples;
    const story = makeStoryProfile('medio', { bluff: 0.91, label: 'Tío Pepe', samples: 7 });
    expect(story.bluff).toBe(0.91);
    expect(story.label).toBe('Tío Pepe');
    expect(story.samples).toBe(7);
    expect(story.envidoBias).toBe(AI_PROFILES.medio.envidoBias);
    expect(AI_PROFILES.medio.samples).toBe(original);
    expect(AI_PROFILES.medio.bluff).not.toBe(0.91);
  });
});

describe('partidas completas', () => {
  it('40 partidas por dificultad terminan y siempre se juega una acción legal', () => {
    for (const difficulty of ['facil', 'medio', 'dificil'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        playMatch(seed, [difficulty, difficulty]);
      }
    }
  });

  it('dificil gana más que facil en 40 enfrentamientos deterministas', () => {
    let hardWins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      // Alternamos lados para que el mano no decida el resultado.
      const strongOn: PlayerIndex = seed % 2 === 0 ? 1 : 0;
      const levels: [Difficulty, Difficulty] =
        strongOn === 0 ? ['dificil', 'facil'] : ['facil', 'dificil'];
      const winner = playMatch(seed, levels);
      if (winner === strongOn) hardWins++;
    }
    expect(hardWins).toBeGreaterThan(20);
  });

  it('no lanza y devuelve una acción válida en la partida si el jugador no debe actuar', () => {
    const game = new TrucoGame(31);
    const actor = game.state.turn;
    const idle: PlayerIndex = actor === 0 ? 1 : 0;
    let fallback: GameAction | null = null;
    expect(() => {
      fallback = chooseAiAction(game, idle, 'medio', mulberry32(1));
    }).not.toThrow();
    expect(fallback).not.toBeNull();
    expect(game.legalActions(actor).some((a) => a.type === fallback!.type)).toBe(true);

    game.dispatch(actor, { type: 'callTruco' });
    const caller = game.state.pending!.by;
    expect(() => chooseAiAction(game, caller, 'dificil', mulberry32(2))).not.toThrow();
  });
});

describe('decisiones con manos fuertes', () => {
  const strongHand = [card(1, 'espada'), card(1, 'basto'), card(3, 'copa')];
  // Rival con cartas aceptables: aceptar truco es razonable, así que cantar vale 2 puntos.
  const rivalHand = [card(7, 'espada'), card(3, 'oro'), card(2, 'basto')];

  it('nunca se rinde con una mano muy fuerte', () => {
    const game = setup([strongHand, rivalHand]);
    for (const difficulty of ['facil', 'medio', 'dificil'] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const action = chooseAiAction(game, 0, difficulty, mulberry32(seed));
        expect(action.type).not.toBe('fold');
      }
    }
  });

  it('considera cantar truco con una mano muy fuerte', () => {
    const game = setup([strongHand, rivalHand]);
    const types = new Set<GameAction['type']>();
    for (let seed = 1; seed <= 12; seed++) {
      types.add(chooseAiAction(game, 0, 'dificil', mulberry32(seed)).type);
    }
    expect(types.has('callTruco')).toBe(true);
  });
});

describe('cantos de envido legales', () => {
  it('no canta envido después de haberse jugado una carta', () => {
    const game = setup([
      [card(7, 'oro'), card(6, 'oro'), card(3, 'copa')],
      [card(1, 'espada'), card(2, 'basto'), card(5, 'copa')],
    ]);
    game.dispatch(0, { type: 'playCard', cardId: card(7, 'oro').id });
    for (let seed = 1; seed <= 10; seed++) {
      const action = chooseAiAction(game, 1, 'dificil', mulberry32(seed));
      expect(ENVIDO_CALLS).not.toContain(action.type);
    }
    game.dispatch(1, { type: 'playCard', cardId: card(1, 'espada').id });
    for (let seed = 1; seed <= 10; seed++) {
      const action = chooseAiAction(game, 0, 'dificil', mulberry32(seed));
      expect(ENVIDO_CALLS).not.toContain(action.type);
    }
  });

  it('no canta falta empatado ni vuelve a cantar envido tras un rechazo', () => {
    const tied = setup([
      [card(7, 'oro'), card(6, 'oro'), card(3, 'copa')],
      [card(1, 'espada'), card(2, 'basto'), card(5, 'copa')],
    ]);
    tied.state.scores = [5, 5];
    const greedy = makeStoryProfile('dificil', { bluff: 1, envidoBias: 1 });
    for (let seed = 1; seed <= 10; seed++) {
      const action = chooseAiAction(tied, 0, greedy, mulberry32(seed));
      expect(action.type).not.toBe('callFalta');
    }

    const declined = setup([
      [card(7, 'oro'), card(6, 'oro'), card(3, 'copa')],
      [card(1, 'espada'), card(2, 'basto'), card(5, 'copa')],
    ]);
    declined.dispatch(0, { type: 'callEnvido' });
    declined.dispatch(1, { type: 'declineEnvido' });
    for (let seed = 1; seed <= 10; seed++) {
      const action = chooseAiAction(declined, 0, greedy, mulberry32(seed));
      expect(ENVIDO_CALLS).not.toContain(action.type);
    }
  });
});
