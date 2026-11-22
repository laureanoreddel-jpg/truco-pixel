import type { Card, EnvidoBid, EnvidoCall, EnvidoLevel, PlayerIndex, Suit, TrucoLevel } from './types';

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

/** Mano sin canto = 1, truco = 2, retruco = 3, vale cuatro = 4. */
export function trucoPoints(level: TrucoLevel | 0): number {
  return level === 0 ? 1 : level + 1;
}

/** Rechazar truco entrega el escalón anterior (1, 2 o 3). */
export function declinePoints(kind: 'truco' | 'envido', level: TrucoLevel | EnvidoLevel): number {
  if (kind === 'truco') return level;
  // Para envido se usa `envidoDecline` con la cadena completa; estos valores
  // son sólo el caso de un canto único (y el de falta directa).
  return level === 3 ? 2 : 1;
}

export const ENVIDO_CALL_NAMES: Record<EnvidoCall, string> = {
  envido: 'ENVIDO',
  real: 'REAL ENVIDO',
  doble: 'ENVIDO ENVIDO',
  falta: 'FALTA ENVIDO',
};

export function envidoLevelForCall(call: EnvidoCall): EnvidoLevel {
  return call === 'envido' ? 1 : call === 'real' ? 2 : call === 'doble' ? 3 : 4;
}

/** Cada palabra "envido" vale 2; el real vale 3; la falta reemplaza la bolsa. */
export function envidoCallValue(call: EnvidoCall, scores: [number, number], targetScore: number): number {
  if (call === 'falta') return Math.max(1, targetScore - Math.max(scores[0], scores[1]));
  return call === 'real' ? 3 : 2;
}

/** Total de la bolsa: se suman los cantos, excepto la falta, que reemplaza. */
export function envidoPotForBids(bids: EnvidoBid[]): number {
  const last = bids[bids.length - 1];
  if (last?.call === 'falta') return last.value;
  return bids.reduce((total, bid) => total + bid.value, 0);
}

/** No quiero = lo que valía la cadena antes del último canto, o 1 si era el primero. */
export function envidoDecline(bids: EnvidoBid[]): number {
  if (bids.length <= 1) return 1;
  const before = bids.slice(0, -1);
  return Math.max(1, envidoPotForBids(before));
}

/**
 * Subas legales según el reglamento: cada canto debe subir, no repetir nivel.
 * «Envido envido» es el segundo «envido» (2 + 2 = 4); después se puede seguir
 * con real envido (7) o falta. Un real envido directo (o como respuesta) sólo
 * admite falta como revido. La falta es terminal y reemplaza la bolsa.
 */
export function envidoRaisesFor(bids: EnvidoBid[]): EnvidoCall[] {
  if (bids.length === 0) return ['envido', 'real', 'falta'];
  const last = bids[bids.length - 1];
  if (last.call === 'falta') return [];
  if (last.call === 'real') return ['falta'];
  const envidos = bids.filter((bid) => bid.call === 'envido').length;
  if (envidos >= 2) return ['real', 'falta'];
  return ['envido', 'real', 'falta'];
}

/** Cantidad de palabras «envido» cantadas hasta ahora. */
export function envidoWordCount(bids: EnvidoBid[]): number {
  return bids.filter((bid) => bid.call === 'envido').length;
}

/** Convierte un canto en la acción pública equivalente. */
export function envidoActionForCall(call: EnvidoCall): Extract<import('./types').GameAction, { type: 'callEnvido' | 'callRealEnvido' | 'callEnvidoEnvido' | 'callFalta' }> {
  if (call === 'envido') return { type: 'callEnvido' };
  if (call === 'real') return { type: 'callRealEnvido' };
  if (call === 'doble') return { type: 'callEnvidoEnvido' };
  return { type: 'callFalta' };
}

export function callForEnvidoAction(type: string): EnvidoCall | null {
  if (type === 'callEnvido') return 'envido';
  if (type === 'callRealEnvido') return 'real';
  if (type === 'callEnvidoEnvido') return 'doble';
  if (type === 'callFalta') return 'falta';
  return null;
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

export function envidoCards(score: EnvidoScore): Card[] {
  return score.pair ? [...score.pair] : score.highest ? [score.highest] : [];
}
