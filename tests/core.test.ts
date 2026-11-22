import { describe, expect, it } from 'vitest';
import { chooseAiAction } from '../src/core/ai';
import { createDeck } from '../src/core/deck';
import { TrucoGame } from '../src/core/game';
import { cardStrength, envidoScore } from '../src/core/hand';
import type { Card, Rank, Suit } from '../src/core/types';

const card = (rank: Rank, suit: Suit): Card => ({ id: `${rank}-${suit}`, rank, suit });

describe('baraja y jerarquía', () => {
  it('tiene 40 cartas únicas', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((c) => c.id)).size).toBe(40);
  });

  it('ordena correctamente las cartas especiales', () => {
    const order: Card[] = [
      card(1, 'espada'),
      card(1, 'basto'),
      card(7, 'espada'),
      card(7, 'oro'),
      card(1, 'oro'),
      card(7, 'copa'),
      card(7, 'basto'),
      card(6, 'copa'),
      card(2, 'espada'),
      card(1, 'copa'),
      card(12, 'oro'),
      card(11, 'copa'),
      card(10, 'basto'),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(cardStrength(order[i - 1])).toBeGreaterThan(cardStrength(order[i]));
    }
  });

  it('empata cartas del mismo número y figuras', () => {
    expect(cardStrength(card(6, 'oro'))).toBe(cardStrength(card(6, 'copa')));
    expect(cardStrength(card(12, 'oro'))).toBe(cardStrength(card(12, 'copa')));
  });
});

describe('envido', () => {
  it('suma 20 + las dos cartas del mismo palo', () => {
    const score = envidoScore([card(7, 'oro'), card(6, 'oro'), card(7, 'copa')]);
    expect(score.points).toBe(33);
  });

  it('sin pareja toma la carta mayor (figuras valen 0)', () => {
    expect(envidoScore([card(7, 'espada'), card(1, 'basto'), card(12, 'copa')]).points).toBe(7);
    expect(envidoScore([card(12, 'copa'), card(11, 'oro'), card(10, 'basto')]).points).toBe(0);
  });
});

describe('flujo de juego', () => {
  const setup = (hands: [Card[], Card[]]) => {
    const game = new TrucoGame(42);
    game.state.hands = [hands[0].slice(), hands[1].slice()];
    game.state.turn = game.state.mano;
    return game;
  };

  it('jugar carta cambia el turno y resuelve la ronda', () => {
    const game = setup([[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]]);
    expect(game.dispatch(0, { type: 'playCard', cardId: card(1, 'espada').id })).toBe(true);
    expect(game.state.turn).toBe(1);
    expect(game.dispatch(1, { type: 'playCard', cardId: card(7, 'basto').id })).toBe(true);
    expect(game.state.roundWins[0]).toBe(1);
    expect(game.state.turn).toBe(0);
  });

  it('rechazar truco da 1 punto y cierra la mano', () => {
    const game = setup([[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]]);
    expect(game.dispatch(0, { type: 'callTruco' })).toBe(true);
    expect(game.legalActions(1).map((a) => a.type)).toContain('raiseTruco');
    expect(game.dispatch(1, { type: 'declineTruco' })).toBe(true);
    expect(game.state.scores[0]).toBe(1);
    expect(game.state.phase).toBe('handEnd');
  });

  it('aceptar truco y re-trucodefine el valor de la mano', () => {
    const game = setup([[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]]);
    game.dispatch(0, { type: 'callTruco' });
    game.dispatch(1, { type: 'raiseTruco' });
    expect(game.legalActions(0).map((a) => a.type)).toContain('acceptTruco');
    game.dispatch(0, { type: 'acceptTruco' });
    expect(game.state.trucoLevel).toBe(2);
  });

  it('rechazar envido no cierra la mano y da 1 punto', () => {
    const game = setup([[card(7, 'oro'), card(6, 'oro'), card(3, 'copa')], [card(1, 'espada'), card(2, 'basto'), card(5, 'copa')]]);
    game.dispatch(0, { type: 'callEnvido' });
    expect(game.dispatch(1, { type: 'declineEnvido' })).toBe(true);
    expect(game.state.scores[0]).toBe(1);
    expect(game.state.phase).toBe('playing');
    expect(game.legalActions(0).some((a) => a.type === 'callEnvido')).toBe(false);
  });

  it('aceptar envido lo paga al ganador al cerrar la mano', () => {
    const game = setup([[card(7, 'oro'), card(6, 'oro'), card(3, 'copa')], [card(1, 'basto'), card(2, 'espada'), card(5, 'copa')]]);
    game.dispatch(0, { type: 'callEnvido' });
    game.dispatch(1, { type: 'acceptEnvido' });
    expect(game.state.envidoResult).toEqual({ winner: 0, score: 33, prize: 2 });
    for (let step = 0; step < 10 && game.state.phase === 'playing'; step++) {
      const player = game.state.turn;
      const next = game.legalActions(player).find((a) => a.type === 'playCard');
      if (!next) break;
      game.dispatch(player, next);
    }
    expect(game.state.scores[0]).toBeGreaterThanOrEqual(2);
  });

  it('el real envido suma al envido ya cantado', () => {
    const game = setup([[card(7, 'oro'), card(6, 'oro'), card(3, 'copa')], [card(1, 'basto'), card(2, 'espada'), card(5, 'copa')]]);
    game.dispatch(0, { type: 'callEnvido' });
    game.dispatch(1, { type: 'callRealEnvido' });
    game.dispatch(0, { type: 'acceptEnvido' });
    expect(game.state.envidoPot).toBe(5);
    expect(game.state.envidoResult).toMatchObject({ winner: 0, score: 33, prize: 5 });
  });

  it('el falta envido apuesta los puntos que le faltan al que lo canta', () => {
    const game = setup([[card(7, 'oro'), card(6, 'oro'), card(3, 'copa')], [card(1, 'basto'), card(2, 'espada'), card(5, 'copa')]]);
    game.state.scores = [8, 2];
    game.dispatch(0, { type: 'callFalta' });
    game.dispatch(1, { type: 'acceptEnvido' });
    expect(game.state.envidoPot).toBe(7);
    expect(game.state.envidoResult).toEqual({ winner: 0, score: 33, prize: 7 });
  });

  it('irse al mazo entrega la mano al rival', () => {
    const game = setup([[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]]);
    expect(game.legalActions(0).some((a) => a.type === 'fold')).toBe(true);
    game.dispatch(0, { type: 'fold' });
    expect(game.state.scores[1]).toBe(1);
    expect(game.state.phase).toBe('handEnd');
  });

  it('cierra la mano después de tres rondas y permite pasar a la siguiente', () => {
    const game = setup(
      [[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]],
    );
    const play = (player: 0 | 1, played: Card) => {
      expect(game.dispatch(player, { type: 'playCard', cardId: played.id })).toBe(true);
    };

    play(0, card(1, 'espada'));
    play(1, card(7, 'basto'));
    play(0, card(2, 'oro'));
    play(1, card(6, 'oro'));
    play(1, card(5, 'copa'));
    play(0, card(3, 'copa'));

    expect(game.state.round).toBe(3);
    expect(game.state.phase).toBe('handEnd');
    expect(game.state.played.length).toBe(3);
    expect(game.legalActions(game.state.turn)).toEqual([{ type: 'nextHand' }]);
    expect(game.dispatch(game.state.turn, { type: 'nextHand' })).toBe(true);
    expect(game.state.round).toBe(0);
    expect(game.state.phase).toBe('playing');
  });

  it('termina al llegar a 15 puntos', () => {
    const game = setup([[card(1, 'espada'), card(2, 'oro'), card(3, 'copa')], [card(7, 'basto'), card(6, 'oro'), card(5, 'copa')]]);
    game.state.scores = [14, 0];
    game.dispatch(0, { type: 'callTruco' });
    game.dispatch(1, { type: 'declineTruco' });
    expect(game.state.phase).toBe('gameEnd');
    expect(game.state.winner).toBe(0);
  });

  it('alterna el mano entre manos', () => {
    const game = new TrucoGame(7);
    expect(game.state.mano).toBe(0);
    game.dispatch(0, { type: 'callTruco' });
    game.dispatch(1, { type: 'declineTruco' });
    game.dispatch(0, { type: 'nextHand' });
    expect(game.state.mano).toBe(1);
    expect(game.state.turn).toBe(1);
  });
});

describe('IA', () => {
  it('siempre devuelve una acción legal', () => {
    const game = new TrucoGame(123);
    for (let step = 0; step < 500 && game.state.phase !== 'gameEnd'; step++) {
      const player = game.state.pending
        ? (game.state.pending.by === 0 ? 1 : 0)
        : game.state.phase === 'handEnd'
          ? 0
          : game.state.turn;
      const action = chooseAiAction(game, player, 'medio');
      const legal = game.legalActions(player).some((a) => a.type === action.type);
      expect(legal).toBe(true);
      game.dispatch(player, action);
    }
    expect(game.state.phase).toBe('gameEnd');
  });
});
