import { createDeck, mulberry32, shuffle } from './deck';
import { cardStrength, cardValue, declinePoints, envidoScore, sortHand, trucoPoints } from './hand';
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
      roundPoints: [0, 0],
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
      lastHand: null,
      pending: null,
      deferredTruco: null,
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
    s.hands = [sortHand(deck.slice(0, 3)), sortHand(deck.slice(3, 6))];
    s.played = [
      [null, null],
      [null, null],
      [null, null],
    ];
    s.roundWins = [0, 0];
    s.roundPoints = [0, 0];
    s.round = 0;
    s.turn = s.mano;
    s.trucoLevel = 0;
    s.trucoCaller = null;
    s.envidoStatus = 'open';
    s.envidoPot = 0;
    s.envidoLevel = 0;
    s.envidoCaller = null;
    s.envidoResult = null;
    s.lastHand = null;
    s.pending = null;
    s.deferredTruco = null;
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

  private roundWinner(roundIndex: number): PlayerIndex | null {
    const round = this.state.played[roundIndex];
    if (!round || !round[0] || !round[1]) return null;
    const diff = cardStrength(round[0]) - cardStrength(round[1]);
    return diff > 0 ? 0 : diff < 0 ? 1 : null;
  }

  private roundIsTie(roundIndex: number): boolean {
    const round = this.state.played[roundIndex];
    return Boolean(round?.[0] && round[1]) && this.roundWinner(roundIndex) === null;
  }

  /** El envido solo se canta antes de la primera carta, mientras no esté resuelto. */
  private canSingEnvido(): boolean {
    const status = this.state.envidoStatus;
    return this.cardsPlayed() === 0 && status !== 'declined' && status !== 'accepted';
  }

  /** Falta envido requiere que haya un puntero (no se puede cantar empatados). */
  private canCallFalta(player: PlayerIndex): boolean {
    return this.state.scores[player] !== this.state.scores[other(player)];
  }

  private envidoBid(level: EnvidoLevel, player: PlayerIndex): number {
    if (level === 4) return Math.max(1, this.targetScore - this.state.scores[other(player)]);
    return level === 1 ? 2 : level === 2 ? 3 : 4;
  }

  private envidoCalls(player: PlayerIndex, minLevel = 1): GameAction[] {
    const actions: GameAction[] = [];
    if (minLevel <= 1) actions.push({ type: 'callEnvido' });
    if (minLevel <= 2) actions.push({ type: 'callRealEnvido' });
    if (minLevel <= 3) actions.push({ type: 'callEnvidoEnvido' });
    if (minLevel <= 4 && this.canCallFalta(player)) actions.push({ type: 'callFalta' });
    return actions;
  }

  private openEnvido(player: PlayerIndex, level: EnvidoLevel): boolean {
    const s = this.state;
    if (!this.canSingEnvido()) return false;
    if (level === 4 && !this.canCallFalta(player)) return false;
    const bid = this.envidoBid(level, player);
    const potAfter = this.currentEnvidoPot() + bid;
    // "Envido va primero": si había un truco cantado, queda diferido.
    if (s.pending?.kind === 'truco') s.deferredTruco = s.pending;
    s.envidoStatus = 'called';
    s.envidoLevel = level;
    s.envidoCaller = player;
    s.pending = { kind: 'envido', by: player, level, bid, potAfter };
    const name = ['', 'ENVIDO', 'REAL ENVIDO', 'ENVIDO ENVIDO', 'FALTA ENVIDO'][level];
    s.lastEvent = `${PLAYER_NAMES[player]} dice ${name} (+${bid}, bolsa ${potAfter})`;
    this.log(s.lastEvent);
    return true;
  }

  private restoreDeferredTruco(): void {
    const s = this.state;
    const deferred = s.deferredTruco;
    if (!deferred || deferred.kind !== 'truco' || s.phase !== 'playing') return;
    s.pending = deferred;
    s.deferredTruco = null;
    s.lastEvent = `${s.lastEvent}. Sigue el truco por ${trucoPoints(deferred.level)}`;
    this.log(s.lastEvent);
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
        // El rival puede exigir que el envido se resuelva antes que el truco.
        if (this.canSingEnvido()) actions.push(...this.envidoCalls(player));
        return actions;
      }
      const actions: GameAction[] = [{ type: 'acceptEnvido' }, { type: 'declineEnvido' }];
      // Solo se puede subir de escalón: envido → real → envido envido → falta.
      actions.push(...this.envidoCalls(player, (s.envidoLevel ?? 0) + 1));
      return actions;
    }

    if (s.turn !== player) return [];

    const actions: GameAction[] = s.hands[player].map((card) => ({ type: 'playCard', cardId: card.id }));
    if (s.trucoLevel === 0) actions.push({ type: 'callTruco' });
    // Retruco/vale cuatro los puede cantar quien recibió el canto, también después de aceptar.
    else if (s.trucoLevel < 3 && s.trucoCaller !== player) actions.push({ type: 'raiseTruco' });
    actions.push({ type: 'fold' });
    if (this.canSingEnvido()) actions.push(...this.envidoCalls(player));
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
        const { by: caller, level } = s.pending;
        s.pending = null;
        s.lastEvent = `${PLAYER_NAMES[other(caller)]} no acepta: ${PLAYER_NAMES[caller]} gana ${level}`;
        this.finishHand(caller, level, 'truco rechazado');
        return true;
      }
      case 'callEnvido':
        return this.openEnvido(player, 1);
      case 'callRealEnvido':
        return this.openEnvido(player, 2);
      case 'callEnvidoEnvido':
        return this.openEnvido(player, 3);
      case 'callFalta':
        return this.openEnvido(player, 4);
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
        this.restoreDeferredTruco();
        return true;
      }
      case 'declineEnvido': {
        if (s.pending?.kind !== 'envido') return false;
        const { by: caller, level } = s.pending;
        // Rechazo = escalón anterior: 1, 2, 3 o 4 puntos.
        const points = declinePoints('envido', level);
        s.pending = null;
        s.envidoStatus = 'declined';
        s.lastEvent = `${PLAYER_NAMES[other(caller)]} no acepta: ${PLAYER_NAMES[caller]} gana ${points}`;
        this.log(s.lastEvent);
        this.award(caller, points);
        this.checkGameEnd();
        this.restoreDeferredTruco();
        return true;
      }
      case 'fold': {
        const winner = other(player);
        // Antes de cerrar el turno del envido, abandonar cuesta envido + truco.
        const mazoPoints = trucoPoints(s.trucoLevel) + (this.canSingEnvido() ? 1 : 0);
        s.lastEvent = `${PLAYER_NAMES[player]} se fue al mazo`;
        this.log(s.lastEvent);
        this.finishHand(winner, mazoPoints, 'mazo');
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
    const winner = this.roundWinner(s.round);
    if (winner === null) {
      s.lastEvent = `Ronda ${s.round + 1}: parda`;
    } else {
      s.roundWins[winner] += 1;
      s.roundPoints[winner] += 1;
      s.lastEvent = `Ronda ${s.round + 1}: gana ${PLAYER_NAMES[winner]}`;
    }
    this.log(s.lastEvent);
    s.turn = winner ?? s.mano;
    s.round += 1;
    if (this.handIsDecided()) this.finishHandByRounds();
  }

  /**
   * Pardas según el reglamento: si empatan las dos primeras, decide la tercera;
   * si empatan las tres, gana el mano. Si se empata la segunda gana quien ganó la primera.
   */
  private handIsDecided(): boolean {
    const s = this.state;
    if (s.round >= 3) return true;
    if (s.round < 2) return false;
    const first = this.roundWinner(0);
    const second = this.roundWinner(1);
    if (first === null) return second !== null;
    if (second === null) return true;
    return first === second;
  }

  private decideHandWinner(): PlayerIndex {
    const s = this.state;
    const first = this.roundWinner(0);
    const second = this.roundWinner(1);
    const third = this.roundWinner(2);
    if (first !== null) {
      if (second === null || second === first) return first;
      return third ?? first; // parda en la tercera: vuelve a quien ganó la primera
    }
    if (second !== null) return second; // parda en la primera: decide la segunda
    return third ?? s.mano; // tres pardas: gana el mano
  }

  private finishHandByRounds(): void {
    const s = this.state;
    const handWinner = this.decideHandWinner();
    const pardas = [0, 1, 2].filter((round) => this.roundWinner(round) === null).length;
    const reason = pardas === 3 ? 'tres pardas (mano)' : pardas > 0 ? 'parda' : 'mano';
    this.finishHand(handWinner, trucoPoints(s.trucoLevel), reason);
  }

  private finishHand(handWinner: PlayerIndex, handPoints: number, reason: string): void {
    const s = this.state;
    if (s.envidoResult) {
      this.award(s.envidoResult.winner, s.envidoResult.prize);
    }
    this.award(handWinner, handPoints);
    s.lastHand = { winner: handWinner, points: handPoints, reason };
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
