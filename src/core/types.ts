export type Suit = 'espada' | 'basto' | 'oro' | 'copa';

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export type PlayerIndex = 0 | 1;

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export type Phase = 'playing' | 'handEnd' | 'gameEnd';

export type TrucoLevel = 1 | 2 | 3;

export type EnvidoLevel = 1 | 2 | 3;

export type EnvidoStatus = 'open' | 'called' | 'accepted' | 'declined' | 'closed';

export type PendingChallenge =
  | { kind: 'truco'; by: PlayerIndex; level: TrucoLevel }
  | { kind: 'envido'; by: PlayerIndex; level: EnvidoLevel; bid: number; potAfter: number };

export interface EnvidoResult {
  winner: PlayerIndex;
  /** Puntaje de envido de las cartas del ganador (ej. 33). */
  score: number;
  /** Puntos en juego aceptados (envido + real + falta). */
  prize: number;
}

export type GameAction =
  | { type: 'playCard'; cardId: string }
  | { type: 'callTruco' }
  | { type: 'acceptTruco' }
  | { type: 'raiseTruco' }
  | { type: 'declineTruco' }
  | { type: 'callEnvido' }
  | { type: 'callRealEnvido' }
  | { type: 'callFalta' }
  | { type: 'fold' }
  | { type: 'acceptEnvido' }
  | { type: 'declineEnvido' }
  | { type: 'nextHand' }
  | { type: 'restart' };

export interface GameState {
  phase: Phase;
  scores: [number, number];
  hands: [Card[], Card[]];
  /** [ronda][jugador], null mientras ese jugador no tiró su carta en la ronda. */
  played: [[Card | null, Card | null], [Card | null, Card | null], [Card | null, Card | null]];
  roundWins: [number, number];
  round: number;
  turn: PlayerIndex;
  /** Jugador que arranca la mano (equivalente al "mano" en truco). */
  mano: PlayerIndex;
  trucoLevel: 0 | TrucoLevel;
  trucoCaller: PlayerIndex | null;
  envidoStatus: EnvidoStatus;
  envidoPot: number;
  envidoLevel: 0 | EnvidoLevel;
  envidoCaller: PlayerIndex | null;
  envidoResult: EnvidoResult | null;
  pending: PendingChallenge | null;
  winner: PlayerIndex | null;
  log: string[];
  lastEvent: string;
  handNumber: number;
  targetScore: number;
}

export const PLAYER_NAMES: [string, string] = ['Jugador 1', 'Jugador 2'];

export function other(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}
