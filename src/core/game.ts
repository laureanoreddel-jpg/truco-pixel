import { createDeck, mulberry32, shuffle } from './deck';
import { cardStrength, cardValue, envidoScore, trucoPoints } from './hand';
import {
  other,
  PLAYER_NAMES,
  type Card,
  type EnvidoLevel,
  type GameAction,
  type GameState,
  type PlayerIndex,
  type TrucoLevel,
} from './types';

/**
 * Motor de truco argentino simplificado.
 * Es puro (sin DOM ni red): el cliente local y el servidor online usan la misma instancia.
 */
export class TrucoGame {
  readonly targetScore: number;
  private readonly rng: () => number;
  state: GameState;

  constructor(seed = Date.now(), targetScore = 15) {
    this.rng = mulberry32(seed);
    this.targetScore = targetScore;
    this.state = this.createInitialState();
    this.startHand();
  }

  private createInitialState(): GameState {
    return {
      phase: 'playing',
      scores: [0, 0],
      hands: [[], []],
      played: [
        [null, null],
        [null, null],
        [null, null],
      ],
      roundWins: [0, 0],
      round: 0,
      turn: 0,
      mano: 0,
      trucoLevel: 0,
      trucoCaller: null,
      envidoStatus: 'open',
      envidoPot: 0,
      envidoLevel: 0,
      envidoCaller: null,
      envidoResult: null,
      pending: null,
      winner: null,
      log: [],
      lastEvent: 'Repartiendo cartas...',
      handNumber: 1,
      targetScore: this.targetScore,
    };
  }

  private startHand(): void {
    const deck = shuffle(createDeck(), this.rng);
    const s = this.state;
    s.hands = [deck.slice(0, 3), deck.slice(3, 6)];
    s.played = [
      [null, null],
      [null, null],
      [null, null],
    ];
    s.roundWins = [0, 0];
    s.round = 0;
    s.turn = s.mano;
    s.trucoLevel = 0;
    s.trucoCaller = null;
    s.envidoStatus = 'open';
    s.envidoPot = 0;
    s.envidoLevel = 0;
    s.envidoCaller = null;
    s.envidoResult = null;
    s.pending = null;
    s.phase = 'playing';
    s.winner = null;
    s.lastEvent = `Mano ${s.handNumber}: arranca ${PLAYER_NAMES[s.mano]}`;
    this.log(s.lastEvent);
  }

  private log(message: string): void {
    this.state.log.push(message);
    if (this.state.log.length > 30) this.state.log.shift();
  }

  cardsPlayed(): number {
    return this.state.played.reduce(
      (count, round) => count + round.filter((card) => card !== null).length,
      0,
    );
  }

  /** Puntos en juego contando la apuesta que está esperando respuesta. */
  private currentEnvidoPot(): number {
    return this.state.envidoPot + (this.state.pending?.kind === 'envido' ? this.state.pending.bid : 0);
  }

  private roundIsTie(roundIndex: number): boolean {
    const round = this.state.played[roundIndex];
    if (!round || !round[0] || !round[1]) return false;
    return cardStrength(round[0]) === cardStrength(round[1]);
  }

  legalActions(player: PlayerIndex): GameAction[] {
    const s = this.state;
    if (s.phase === 'handEnd') return [{ type: 'nextHand' }];
    if (s.phase === 'gameEnd') return [{ type: 'restart' }];

    if (s.pending) {
      if (s.pending.by === player) return [];
      if (s.pending.kind === 'truco') {
        const actions: GameAction[] = [{ type: 'acceptTruco' }, { type: 'declineTruco' }];
        if (s.pending.level < 3) actions.push({ type: 'raiseTruco' });
        return actions;
      }
      const actions: GameAction[] = [{ type: 'acceptEnvido' }, { type: 'declineEnvido' }];
      if (s.envidoLevel < 3 && this.currentEnvidoPot() < 12) {
        actions.push({ type: 'callEnvido' }, { type: 'callRealEnvido' });
        if (s.scores[player] !== s.scores[other(player)]) actions.push({ type: 'callFalta' });
      }
      return actions;
    }

    if (s.turn !== player) return [];

    const actions: GameAction[] = s.hands[player].map((card) => ({ type: 'playCard', cardId: card.id }));
    if (s.trucoLevel === 0) actions.push({ type: 'callTruco' });
    else if (s.trucoLevel < 3) actions.push({ type: 'raiseTruco' });
    actions.push({ type: 'fold' });
    if (this.cardsPlayed() === 0 && s.envidoStatus !== 'declined' && s.envidoStatus !== 'accepted') {
      actions.push({ type: 'callEnvido' });
      if (this.currentEnvidoPot() < 12) actions.push({ type: 'callRealEnvido' });
      if (s.scores[player] !== s.scores[other(player)]) actions.push({ type: 'callFalta' });
    }
    return actions;
  }

  dispatch(player: PlayerIndex, action: GameAction): boolean {
    if (!this.legalActions(player).some((legal) => legal.type === action.type && ('cardId' in legal ? legal.cardId === (action as { cardId?: string }).cardId : true))) {
      return false;
    }
    const s = this.state;
    switch (action.type) {
      case 'playCard': {
        const index = s.hands[player].findIndex((card) => card.id === action.cardId);
        if (index < 0) return false;
        const [card] = s.hands[player].splice(index, 1);
        s.played[s.round][player] = card;
        this.log(`${PLAYER_NAMES[player]} juega ${card.rank} de ${card.suit}`);
        if (s.played[s.round][0] && s.played[s.round][1]) {
          this.resolveRound();
        } else {
          s.turn = other(player);
        }
        return true;
      }
      case 'callTruco':
        s.pending = { kind: 'truco', by: player, level: 1 };
        s.lastEvent = `${PLAYER_NAMES[player]} dice TRUCO`;
        this.log(s.lastEvent);
        return true;
      case 'raiseTruco': {
        const previous = s.pending?.kind === 'truco' ? s.pending.level : s.trucoLevel;
        if (previous >= 3) return false;
        const level = (previous + 1) as TrucoLevel;
        s.pending = { kind: 'truco', by: player, level };
        s.lastEvent = level === 2 ? 'RETRUCO' : 'VALE CUATRO';
        this.log(`${PLAYER_NAMES[player]} dice ${s.lastEvent}`);
        return true;
      }
      case 'acceptTruco': {
        if (s.pending?.kind !== 'truco') return false;
        s.trucoLevel = s.pending.level;
        s.trucoCaller = s.pending.by;
        s.pending = null;
        s.lastEvent = `Truco por ${s.trucoLevel}`;
        this.log(s.lastEvent);
        return true;
      }
      case 'declineTruco': {
        if (s.pending?.kind !== 'truco') return false;
        const caller = s.pending.by;
        const points = Math.max(1, s.trucoLevel);
        s.pending = null;
        s.lastEvent = `${PLAYER_NAMES[other(caller)]} no acepta: ${PLAYER_NAMES[caller]} gana ${points}`;
        this.finishHand(caller, points, 'truco rechazado');
        return true;
      }
      case 'callEnvido': {
        if (this.cardsPlayed() > 0 || s.envidoStatus === 'declined' || s.envidoStatus === 'accepted') return false;
        const level: EnvidoLevel = s.envidoLevel >= 2 ? 2 : 1;
        const potAfter = this.currentEnvidoPot() + 2;
        s.envidoStatus = 'called';
        s.envidoLevel = level;
        s.envidoCaller = player;
        s.pending = { kind: 'envido', by: player, level, bid: 2, potAfter };
        s.lastEvent = `${PLAYER_NAMES[player]} dice ENVIDO (+2, bolsa ${potAfter})`;
        this.log(s.lastEvent);
        return true;
      }
      case 'callRealEnvido': {
        if (this.cardsPlayed() > 0 || s.envidoStatus === 'declined' || s.envidoStatus === 'accepted') return false;
        const potAfter = this.currentEnvidoPot() + 3;
        s.envidoStatus = 'called';
        s.envidoLevel = 2;
        s.envidoCaller = player;
        s.pending = { kind: 'envido', by: player, level: 2, bid: 3, potAfter };
        s.lastEvent = `${PLAYER_NAMES[player]} dice REAL ENVIDO (+3, bolsa ${potAfter})`;
        this.log(s.lastEvent);
        return true;
      }
      case 'callFalta': {
        if (this.cardsPlayed() > 0 || s.envidoStatus === 'declined' || s.envidoStatus === 'accepted') return false;
        if (s.scores[player] === s.scores[other(player)]) return false;
        const bid = Math.max(1, s.targetScore - s.scores[player]);
        const potAfter = this.currentEnvidoPot() + bid;
        s.envidoStatus = 'called';
        s.envidoLevel = 3;
        s.envidoCaller = player;
        s.pending = { kind: 'envido', by: player, level: 3, bid, potAfter };
        s.lastEvent = `${PLAYER_NAMES[player]} dice FALTA ENVIDO (+${bid}, bolsa ${potAfter})`;
        this.log(s.lastEvent);
        return true;
      }
      case 'acceptEnvido': {
        if (s.pending?.kind !== 'envido') return false;
        s.envidoPot = s.pending.potAfter;
        const scores = [envidoScore(s.hands[0]).points, envidoScore(s.hands[1]).points];
        const winner: PlayerIndex = scores[0] === scores[1] ? s.mano : scores[0] > scores[1] ? 0 : 1;
        s.envidoResult = { winner, score: scores[winner], prize: s.envidoPot };
        s.envidoStatus = 'accepted';
        s.pending = null;
        s.lastEvent = `Envidio ${scores[winner]}: ${PLAYER_NAMES[winner]} gana ${s.envidoPot}`;
        this.log(s.lastEvent);
        return true;
      }
      case 'declineEnvido': {
        if (s.pending?.kind !== 'envido') return false;
        const caller = s.pending.by;
        const points = Math.max(1, s.envidoPot);
        s.pending = null;
        s.envidoStatus = 'declined';
        s.lastEvent = `${PLAYER_NAMES[other(caller)]} no acepta: ${PLAYER_NAMES[caller]} gana ${points}`;
        this.log(s.lastEvent);
        this.award(caller, points);
        this.checkGameEnd();
        return true;
      }
      case 'fold': {
        const winner = other(player);
        s.lastEvent = `${PLAYER_NAMES[player]} se fue al mazo`;
        this.log(s.lastEvent);
        this.finishHand(winner, trucoPoints(s.trucoLevel), 'mazo');
        return true;
      }
      case 'nextHand':
        if (s.phase !== 'handEnd') return false;
        s.handNumber += 1;
        s.mano = other(s.mano);
        this.startHand();
        return true;
      case 'restart':
        if (s.phase !== 'gameEnd') return false;
        this.state = this.createInitialState();
        this.startHand();
        return true;
      default:
        return false;
    }
  }

  private resolveRound(): void {
    const s = this.state;
    const round = s.played[s.round];
    const a = round[0]!;
    const b = round[1]!;
    const strengthA = cardStrength(a);
    const strengthB = cardStrength(b);
    const winner: PlayerIndex | null = strengthA > strengthB ? 0 : strengthB > strengthA ? 1 : null;
    const tiedBefore = s.round > 0 && this.roundIsTie(s.round - 1);

    if (winner === null) {
      s.lastEvent = `Ronda ${s.round + 1}: empate${tiedBefore ? ' (próxima vale doble)' : ''}`;
    } else {
      s.roundWins[winner] += 1;
      s.lastEvent = `Ronda ${s.round + 1}: gana ${PLAYER_NAMES[winner]}${tiedBefore ? ' x2' : ''}`;
    }
    this.log(s.lastEvent);
    s.turn = winner ?? s.mano;
    s.round += 1;

    if (s.round >= 3 || s.roundWins[0] >= 2 || s.roundWins[1] >= 2) {
      this.finishHandByRounds();
    }
  }

  private finishHandByRounds(): void {
    const s = this.state;
    const [wins0, wins1] = s.roundWins;
    const handWinner: PlayerIndex = wins0 > wins1 ? 0 : wins1 > wins0 ? 1 : s.mano;
    const lastRound = s.round - 1;
    const tiedBefore = lastRound > 0 && this.roundIsTie(lastRound - 1);
    const handPoints = trucoPoints(s.trucoLevel) * (tiedBefore ? 2 : 1);
    this.finishHand(handWinner, handPoints, tiedBefore ? 'mano doble' : 'mano');
  }

  private finishHand(handWinner: PlayerIndex, handPoints: number, reason: string): void {
    const s = this.state;
    if (s.envidoResult) {
      this.award(s.envidoResult.winner, s.envidoResult.prize);
    }
    this.award(handWinner, handPoints);
    s.lastEvent = `${PLAYER_NAMES[handWinner]} se lleva ${handPoints} (${reason})`;
    this.log(s.lastEvent);
    this.checkGameEnd();
    if (s.phase !== 'gameEnd') s.phase = 'handEnd';
  }

  private award(player: PlayerIndex, points: number): void {
    this.state.scores[player] += points;
  }

  private checkGameEnd(): void {
    const s = this.state;
    if (s.scores[0] >= s.targetScore || s.scores[1] >= s.targetScore) {
      s.phase = 'gameEnd';
      s.winner = s.scores[0] >= s.targetScore ? 0 : 1;
      s.lastEvent = `¡${PLAYER_NAMES[s.winner]} gana la partida!`;
      this.log(s.lastEvent);
    }
  }

  /** Envido del jugador, para la IA y la interfaz. */
  envidoFor(player: PlayerIndex): number {
    return envidoScore(this.state.hands[player]).points;
  }

  /** Fuerza de la mano (suma de las 2 mejores cartas), para la IA. */
  handStrength(player: PlayerIndex): number {
    const strengths = this.state.hands[player].map(cardStrength).sort((a, b) => b - a);
    return strengths[0] + strengths[1];
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state)) as GameState;
  }

  /** Carta jugada por el rival en la ronda actual, si ya la tiró. */
  currentOpponentCard(player: PlayerIndex): Card | null {
    return this.state.played[Math.min(this.state.round, 2)][other(player)];
  }

  bestValueInHand(player: PlayerIndex): number {
    return this.state.hands[player].reduce((max, card) => Math.max(max, cardValue(card)), 0);
  }
}
