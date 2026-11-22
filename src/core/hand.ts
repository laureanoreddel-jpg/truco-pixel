import type { Card, EnvidoLevel, PlayerIndex, Suit, TrucoLevel } from './types';

export const SUIT_LABELS: Record<Suit, string> = {
  espada: 'espada',
  basto: 'basto',
  oro: 'oro',
  copa: 'copa',
};

export const SUIT_SHORT: Record<Suit, string> = {
  espada: 'E',
  basto: 'B',
  oro: 'O',
  copa: 'C',
};

const SPECIALS: Array<{ rank: number; suit: Suit }> = [
  { rank: 1, suit: 'espada' },
  { rank: 1, suit: 'basto' },
  { rank: 7, suit: 'espada' },
  { rank: 7, suit: 'oro' },
  { rank: 1, suit: 'oro' },
  { rank: 7, suit: 'copa' },
  { rank: 7, suit: 'basto' },
];

/** Valor de envido de una carta: las figuras valen 0. */
export function cardValue(card: Card): number {
  return card.rank <= 7 ? card.rank : 0;
}

/**
 * Fuerza relativa de la carta para resolver una ronda.
 * Empates: mismo número (o todas las figuras del mismo valor).
 */
export function cardStrength(card: Card): number {
  const special = SPECIALS.findIndex((s) => s.rank === card.rank && s.suit === card.suit);
  if (special >= 0) return 100 - special; // 100..94
  if (card.rank >= 2 && card.rank <= 6) return 80 + card.rank; // 86..82
  if (card.rank === 1 && card.suit === 'copa') return 81; // 1 de copa, después del 2
  if (card.rank === 12) return 40;
  if (card.rank === 11) return 30;
  return 20; // 10
}

export function compareCards(a: Card, b: Card): number {
  return cardStrength(a) - cardStrength(b);
}

export interface EnvidoScore {
  points: number;
  pair: [Card, Card] | null;
  highest: Card | null;
}

/** Envido = 20 + las dos cartas del mismo palo más altas; sin pareja, la carta mayor. */
export function envidoScore(hand: Card[]): EnvidoScore {
  let best: EnvidoScore = { points: 0, pair: null, highest: null };
  for (const card of hand) {
    if (!best.highest || cardValue(card) > cardValue(best.highest)) best.highest = card;
  }
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const a = hand[i];
      const b = hand[j];
      if (a.suit !== b.suit) continue;
      const points = 20 + cardValue(a) + cardValue(b);
      if (points > best.points) best = { points, pair: [a, b], highest: best.highest };
    }
  }
  if (best.pair === null && best.highest) best.points = cardValue(best.highest);
  return best;
}

export function trucoPoints(level: TrucoLevel | 0): number {
  return level === 0 ? 1 : level;
}

export function declinePoints(kind: 'truco' | 'envido', level: TrucoLevel | EnvidoLevel): number {
  if (kind === 'envido') return level === 1 ? 1 : 2;
  return level;
}

export function cardLabel(card: Card): string {
  return `${card.rank} de ${SUIT_LABELS[card.suit]}`;
}

export function sortHand(hand: Card[]): Card[] {
  return hand.slice().sort((a, b) => cardStrength(b) - cardStrength(a));
}

export function strongestCards(hand: Card[]): Card[] {
  return sortHand(hand);
}

export function isMano(player: PlayerIndex, mano: PlayerIndex): boolean {
  return player === mano;
}
