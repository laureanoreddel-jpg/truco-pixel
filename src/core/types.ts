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

/** Canto individual dentro de la cadena de envido. */
export type EnvidoCall = 'envido' | 'real' | 'doble' | 'falta';

/** Se conserva por compatibilidad con la interfaz y los tests antiguos. */
export type EnvidoLevel = 1 | 2 | 3 | 4;

export interface EnvidoBid {
  call: EnvidoCall;
  by: PlayerIndex;
  /** Valor de este canto dentro de la bolsa. La falta reemplaza el total. */
  value: number;
}

export type EnvidoStatus = 'open' | 'called' | 'accepted' | 'declined' | 'closed';

export type PendingChallenge =
  | { kind: 'truco'; by: PlayerIndex; level: TrucoLevel }
  | {
      kind: 'envido';
      by: PlayerIndex;
      bids: EnvidoBid[];
      /** Valor del último canto. */
      bid: number;
      /** Bolsa total si se acepta. */
      potAfter: number;
      /** Puntos para el cantor si no quieren. */
      decline: number;
    };

export interface EnvidoResult {
  winner: PlayerIndex;
  /** Puntaje de envido de las cartas del ganador (ej. 33). */
  score: number;
  /** Puntos en juego aceptados (suma de cantos, o valor de la falta). */
  prize: number;
  /** Cartas que forman el envido ganador; se muestran al cerrar la mano. */
  cards: Card[];
}

export interface HandResult {
  winner: PlayerIndex;
  points: number;
  reason: string;
  /** Desglose para que el resumen explique de dónde salieron los puntos. */
  envido?: { winner: PlayerIndex; score: number; prize: number; cards: Card[] };
  truco?: { winner: PlayerIndex; points: number };
}

export type GameAction =
  | { type: 'playCard'; cardId: string }
  | { type: 'callTruco' }
  | { type: 'acceptTruco' }
  | { type: 'raiseTruco' }
  | { type: 'declineTruco' }
  | { type: 'callEnvido' }
  | { type: 'callRealEnvido' }
  | { type: 'callEnvidoEnvido' }
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
  /** Cantidad real de cartas por mano; en online la mano rival se oculta. */
  handCounts?: [number, number];
  /** [ronda][jugador], null mientras ese jugador no tiró su carta en la ronda. */
  played: [[Card | null, Card | null], [Card | null, Card | null], [Card | null, Card | null]];
  roundWins: [number, number];
  roundPoints: [number, number];
  round: number;
  turn: PlayerIndex;
  /** Jugador que arranca la mano (equivalente al "mano" en truco). */
  mano: PlayerIndex;
  trucoLevel: 0 | TrucoLevel;
  trucoCaller: PlayerIndex | null;
  /** Quién dijo "quiero" al truco; ese jugador ya no puede cantar envido. */
  trucoAcceptedBy: PlayerIndex | null;
  envidoStatus: EnvidoStatus;
  envidoPot: number;
  /** Cadena completa de cantos, en orden. */
  envidoBids: EnvidoBid[];
  /** Último canto (para compatibilidad con la interfaz). */
  envidoLevel: 0 | EnvidoLevel;
  envidoCaller: PlayerIndex | null;
  envidoResult: EnvidoResult | null;
  /** Resultado estructurado de la última mano cerrada, para la interfaz. */
  lastHand: HandResult | null;
  pending: PendingChallenge | null;
  /** Truco cantado antes que el envido: se resuelve primero el envido y después vuelve. */
  deferredTruco: PendingChallenge | null;
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

/** Nombres relativos al jugador que mira la partida. */
export function viewerName(player: PlayerIndex, viewer: PlayerIndex): string {
  return player === viewer ? 'Vos' : 'Rival';
}

/** Reemplaza los nombres absolutos del log por nombres relativos al espectador. */
export function namesForViewer(text: string, viewer: PlayerIndex): string {
  const names: [string, string] = [viewerName(0, viewer), viewerName(1, viewer)];
  return text.replace(/Jugador ([12])/g, (_match, digit: string) => names[Number(digit) === 1 ? 0 : 1]);
}
