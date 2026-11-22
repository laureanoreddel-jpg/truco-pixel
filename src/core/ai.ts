import { TrucoGame } from './game';
import { cardStrength, sortHand } from './hand';
import { other, type GameAction, type PlayerIndex } from './types';

export type Difficulty = 'facil' | 'medio' | 'dificil';

/** Umbrales calibrados para la jerarquía real (1 espada = 190, 4 = 90). */
const ADJUST: Record<Difficulty, number> = { facil: -35, medio: 0, dificil: 25 };
const RAISE_AT: Record<Difficulty, number> = { facil: 360, medio: 340, dificil: 325 };
const FOLD_BELOW: Record<Difficulty, number> = { facil: 110, medio: 150, dificil: 185 };
const TRUCO_AT: Record<Difficulty, number> = { facil: 350, medio: 330, dificil: 310 };

/** Heurística: decide apuestas con umbrales y juega la carta más barata que gana. */
export function chooseAiAction(game: TrucoGame, player: PlayerIndex, difficulty: Difficulty): GameAction {
  const s = game.state;
  const adjust = ADJUST[difficulty];
  const rng = Math.random;
  const behind = s.scores[player] < s.scores[other(player)];

  if (s.pending) {
    if (s.pending.by === player) throw new Error('La IA no debe responder su propio desafío');

    if (s.pending.kind === 'truco') {
      const strength = game.handStrength(player);
      const level = s.pending.level;
      if (strength >= RAISE_AT[difficulty] && level < 3) return { type: 'raiseTruco' };
      const needed = (level === 1 ? 270 : 320) + adjust;
      if (strength >= needed) return { type: 'acceptTruco' };
      if (difficulty === 'facil' && rng() < 0.2) return { type: 'acceptTruco' };
      return { type: 'declineTruco' };
    }

    const envido = game.envidoFor(player);
    const canRaise = s.pending.level < 3;
    if (canRaise && envido >= 33 && rng() < (difficulty === 'facil' ? 0.25 : 0.6)) {
      if (behind) return { type: 'callFalta' };
      return { type: 'callRealEnvido' };
    }
    const needed = s.pending.level === 3 ? 33 : s.pending.level === 1 ? 31 + adjust : 33 + Math.min(0, adjust);
    if (envido >= needed) return { type: 'acceptEnvido' };
    return { type: 'declineEnvido' };
  }

  if (s.phase === 'handEnd') return { type: 'nextHand' };
  if (s.phase === 'gameEnd') return { type: 'restart' };
  if (s.turn !== player) return { type: 'playCard', cardId: s.hands[player][0]?.id ?? '' };

  const played = game.cardsPlayed();
  const envido = game.envidoFor(player);
  const canSingEnvido = played === 0 && s.envidoStatus !== 'declined' && s.envidoStatus !== 'accepted';

  if (canSingEnvido) {
    if (behind && envido >= 32 && rng() < (difficulty === 'facil' ? 0.15 : 0.45)) {
      return { type: 'callFalta' };
    }
    if (envido >= 33 || (difficulty === 'dificil' && envido >= 32 && rng() < 0.5)) {
      return { type: 'callRealEnvido' };
    }
    if (envido >= 32 || (difficulty !== 'facil' && envido >= 31 && rng() < 0.35)) {
      return { type: 'callEnvido' };
    }
  }

  const strength = game.handStrength(player);
  if (strength < FOLD_BELOW[difficulty] && rng() < (difficulty === 'facil' ? 0.15 : 0.35)) {
    return { type: 'fold' };
  }
  if (strength >= TRUCO_AT[difficulty] || (difficulty !== 'facil' && rng() < 0.08)) {
    if (s.trucoLevel === 0) return { type: 'callTruco' };
    if (s.trucoLevel < 3 && strength >= 345 + adjust) return { type: 'raiseTruco' };
  }
  if (s.trucoLevel === 1 && strength >= 355) return { type: 'raiseTruco' };

  const hand = sortHand(s.hands[player]);
  const rivalCard = game.currentOpponentCard(player);
  if (rivalCard) {
    const winners = hand.filter((card) => cardStrength(card) > cardStrength(rivalCard));
    if (winners.length > 0) {
      // Gana con la carta más barata que alcanza.
      return { type: 'playCard', cardId: winners[winners.length - 1].id };
    }
    return { type: 'playCard', cardId: hand[hand.length - 1].id };
  }

  if (s.round === 2) return { type: 'playCard', cardId: hand[0].id };
  // Guarda la carta fuerte para la última ronda.
  const index = hand.length > 1 && strength >= 300 ? 1 : hand.length - 1;
  return { type: 'playCard', cardId: hand[Math.min(index, hand.length - 1)].id };
}
