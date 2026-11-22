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

/** Valor de envido de una carta: las figuras valen 0. */
export function cardValue(card: Card): number {
  return card.rank <= 7 ? card.rank : 0;
}

/**
 * Jerarquía del truco argentino (de mayor a menor):
 * 1 espada, 1 basto, 7 espada, 7 oro, 3, 2, 1 oro/copa, 12, 11, 10,
 * 7 copa/basto, 6, 5, 4. Las cartas del mismo escalón empatan.
 */
export function cardStrength(card: Card): number {
  const { rank, suit } = card;
  if (rank === 1 && suit === 'espada') return 190;
  if (rank === 1 && suit === 'basto') return 185;
  if (rank === 7 && suit === 'espada') return 180;
  if (rank === 7 && suit === 'oro') return 175;
  if (rank === 3) return 170;
  if (rank === 2) return 165;
  if (rank === 1) return 160; // 1 de oro o copa
  if (rank === 12) return 150;
  if (rank === 11) return 140;
  if (rank === 10) return 130;
  if (rank === 7) return 120; // 7 de copa o basto
  if (rank === 6) return 110;
  if (rank === 5) return 100;
  return 90; // 4
}

export function compareCards(a: Card, b: Card): number {
  return cardStrength(a) - cardStrength(b);
}

const TIER_VALUES = [190, 185, 180, 175, 170, 165, 160, 150, 140, 130, 120, 110, 100, 90];

/** Puesto en la jerarquía: 1 = la carta más fuerte, 14 = la más débil. */
export function strengthTier(card: Card): number {
  const index = TIER_VALUES.indexOf(cardStrength(card));
  return index < 0 ? 14 : index + 1;
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
