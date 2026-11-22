"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrucoGame = void 0;
const deck_1 = require("./deck");
const hand_1 = require("./hand");
const types_1 = require("./types");
/**
 * Motor de truco argentino simplificado (sin flor).
 * Es puro (sin DOM ni red): el cliente local y el servidor online usan la misma instancia.
 */
class TrucoGame {
    targetScore;
    rng;
    state;
    constructor(seed = Date.now(), targetScore = 15) {
        this.rng = (0, deck_1.mulberry32)(seed);
        this.targetScore = targetScore;
        this.state = this.createInitialState();
        this.startHand();
    }
    createInitialState() {
        return {
            phase: 'playing',
            scores: [0, 0],
            hands: [[], []],
            handCounts: [0, 0],
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
            trucoAcceptedBy: null,
            envidoStatus: 'open',
            envidoPot: 0,
            envidoBids: [],
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
    startHand() {
        const deck = (0, deck_1.shuffle)((0, deck_1.createDeck)(), this.rng);
        const s = this.state;
        s.hands = [(0, hand_1.sortHand)(deck.slice(0, 3)), (0, hand_1.sortHand)(deck.slice(3, 6))];
        s.handCounts = [s.hands[0].length, s.hands[1].length];
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
        s.trucoAcceptedBy = null;
        s.envidoStatus = 'open';
        s.envidoPot = 0;
        s.envidoBids = [];
        s.envidoLevel = 0;
        s.envidoCaller = null;
        s.envidoResult = null;
        s.lastHand = null;
        s.pending = null;
        s.deferredTruco = null;
        s.phase = 'playing';
        s.winner = null;
        s.lastEvent = `Mano ${s.handNumber}: arranca ${types_1.PLAYER_NAMES[s.mano]}`;
        this.log(s.lastEvent);
    }
    log(message) {
        this.state.log.push(message);
        if (this.state.log.length > 30)
            this.state.log.shift();
    }
    cardsPlayed() {
        return this.state.played.reduce((count, round) => count + round.filter((card) => card !== null).length, 0);
    }
    /** El límite del envido es haber tirado tu propia primera carta. */
    playedFirstCard(player) {
        return this.state.played[0][player] !== null;
    }
    /** No se puede cantar envido después de haber querido el truco. */
    acceptedTruco(_player) {
        // Una vez aceptado el truco, la mano ya entró en su fase de disputa.
        return this.state.trucoLevel > 0;
    }
    canOpenEnvido(player) {
        const s = this.state;
        return (s.envidoStatus === 'open' &&
            s.envidoBids.length === 0 &&
            !this.playedFirstCard(player) &&
            !this.acceptedTruco(player));
    }
    /**
     * Reglamento: no se puede *iniciar* un envido con la primera carta ya tirada,
     * pero quien ya tiró sí puede *responder* un envido ajeno ("los otros tienen
     * la posibilidad de responderle, aunque ya hayan jugado su primera carta").
     * `canOpenEnvido` controla el inicio; acá sólo habilitamos la respuesta.
     */
    canRaiseEnvido(_player) {
        return this.state.envidoStatus === 'called' && !this.acceptedTruco(_player);
    }
    envidoActions(player, bids) {
        const calls = bids.length === 0
            ? ['envido', 'real', 'falta']
            : (0, hand_1.envidoRaisesFor)(bids);
        return calls.map((call) => {
            // El segundo «envido» consecutivo se llama «envido envido» y es UNA sola
            // opción (2 + 2 = 4). Si el canto anterior fue real, la respuesta «envido»
            // es simplemente otro envido (+2) y se ofrece como tal.
            const last = bids[bids.length - 1];
            if (call === 'envido' && last?.call === 'envido' && (0, hand_1.envidoWordCount)(bids) === 1) {
                return { type: 'callEnvidoEnvido' };
            }
            return (0, hand_1.envidoActionForCall)(call);
        });
    }
    openEnvido(player, call, bids) {
        const s = this.state;
        // «Envido envido» es simplemente el segundo canto de «envido».
        const effectiveCall = call === 'doble' ? 'envido' : call;
        const allowed = bids.length === 0
            ? this.canOpenEnvido(player) && call !== 'doble'
            : this.canRaiseEnvido(player) && (0, hand_1.envidoRaisesFor)(bids).includes(effectiveCall) &&
                (call !== 'doble' || (0, hand_1.envidoWordCount)(bids) === 1);
        if (!allowed)
            return false;
        const value = (0, hand_1.envidoCallValue)(effectiveCall, s.scores, this.targetScore);
        const nextBids = [...bids, { call: effectiveCall, by: player, value }];
        const potAfter = (0, hand_1.envidoPotForBids)(nextBids);
        const decline = (0, hand_1.envidoDecline)(nextBids);
        // "Envido va primero": si había un truco cantado, queda diferido.
        if (s.pending?.kind === 'truco')
            s.deferredTruco = s.pending;
        s.pending = { kind: 'envido', by: player, bids: nextBids, bid: value, potAfter, decline };
        s.envidoStatus = 'called';
        s.envidoBids = nextBids;
        s.envidoLevel = (0, hand_1.envidoLevelForCall)(call);
        s.envidoCaller = player;
        const name = hand_1.ENVIDO_CALL_NAMES[call];
        s.lastEvent = `${types_1.PLAYER_NAMES[player]}: ${name} (+${value}, tantos en juego ${potAfter})`;
        this.log(s.lastEvent);
        return true;
    }
    restoreDeferredTruco() {
        const s = this.state;
        const deferred = s.deferredTruco;
        if (!deferred || deferred.kind !== 'truco' || s.phase !== 'playing')
            return;
        s.pending = deferred;
        s.deferredTruco = null;
        s.lastEvent = `${s.lastEvent}. Sigue el truco por ${(0, hand_1.trucoPoints)(deferred.level)}`;
        this.log(s.lastEvent);
    }
    legalActions(player) {
        const s = this.state;
        if (s.phase === 'handEnd')
            return [{ type: 'nextHand' }];
        if (s.phase === 'gameEnd')
            return [{ type: 'restart' }];
        if (s.pending) {
            if (s.pending.by === player)
                return [];
            if (s.pending.kind === 'truco') {
                const actions = [{ type: 'acceptTruco' }, { type: 'declineTruco' }];
                if (s.pending.level < 3)
                    actions.push({ type: 'raiseTruco' });
                // El rival puede exigir que el envido se resuelva antes que el truco.
                if (this.canOpenEnvido(player))
                    actions.push(...this.envidoActions(player, []));
                return actions;
            }
            const actions = [{ type: 'acceptEnvido' }, { type: 'declineEnvido' }];
            if (this.canRaiseEnvido(player))
                actions.push(...this.envidoActions(player, s.pending.bids));
            return actions;
        }
        if (s.turn !== player)
            return [];
        const actions = s.hands[player].map((card) => ({ type: 'playCard', cardId: card.id }));
        if (s.trucoLevel === 0)
            actions.push({ type: 'callTruco' });
        // Retruco/vale cuatro los puede cantar quien recibió el canto, también después de aceptar.
        else if (s.trucoLevel < 3 && s.trucoCaller !== player)
            actions.push({ type: 'raiseTruco' });
        actions.push({ type: 'fold' });
        if (this.canOpenEnvido(player))
            actions.push(...this.envidoActions(player, []));
        return actions;
    }
    dispatch(player, action) {
        if (!this.legalActions(player).some((legal) => legal.type === action.type && ('cardId' in legal ? legal.cardId === action.cardId : true))) {
            return false;
        }
        const s = this.state;
        switch (action.type) {
            case 'playCard': {
                const index = s.hands[player].findIndex((card) => card.id === action.cardId);
                if (index < 0)
                    return false;
                const [card] = s.hands[player].splice(index, 1);
                s.played[s.round][player] = card;
                this.log(`${types_1.PLAYER_NAMES[player]} juega ${(0, hand_1.cardLabel)(card)}`);
                if (s.played[s.round][0] && s.played[s.round][1]) {
                    this.resolveRound();
                }
                else {
                    s.turn = (0, types_1.other)(player);
                }
                return true;
            }
            case 'callTruco':
                s.pending = { kind: 'truco', by: player, level: 1 };
                s.lastEvent = `${types_1.PLAYER_NAMES[player]}: TRUCO`;
                this.log(s.lastEvent);
                return true;
            case 'raiseTruco': {
                const previous = s.pending?.kind === 'truco' ? s.pending.level : s.trucoLevel;
                if (previous >= 3)
                    return false;
                const level = (previous + 1);
                s.pending = { kind: 'truco', by: player, level };
                s.lastEvent = level === 2 ? 'RETRUCO' : 'VALE CUATRO';
                this.log(`${types_1.PLAYER_NAMES[player]}: ${s.lastEvent}`);
                return true;
            }
            case 'acceptTruco': {
                if (s.pending?.kind !== 'truco')
                    return false;
                s.trucoLevel = s.pending.level;
                s.trucoCaller = s.pending.by;
                s.trucoAcceptedBy = (0, types_1.other)(s.pending.by);
                s.pending = null;
                s.lastEvent = `Truco por ${s.trucoLevel}`;
                this.log(s.lastEvent);
                return true;
            }
            case 'declineTruco': {
                if (s.pending?.kind !== 'truco')
                    return false;
                const { by: caller, level } = s.pending;
                s.pending = null;
                s.lastEvent = `Puntos para ${types_1.PLAYER_NAMES[caller]}: ${level}`;
                this.finishHand(caller, level, 'truco rechazado');
                return true;
            }
            case 'callEnvido':
                return this.openEnvido(player, 'envido', s.envidoBids);
            case 'callRealEnvido':
                return this.openEnvido(player, 'real', s.envidoBids);
            case 'callEnvidoEnvido':
                return this.openEnvido(player, 'doble', s.envidoBids);
            case 'callFalta':
                return this.openEnvido(player, 'falta', s.envidoBids);
            case 'acceptEnvido': {
                if (s.pending?.kind !== 'envido')
                    return false;
                const pending = s.pending;
                s.envidoPot = pending.potAfter;
                const scores = [(0, hand_1.envidoScore)(s.hands[0]), (0, hand_1.envidoScore)(s.hands[1])];
                const points = scores.map((score) => score.points);
                const winner = points[0] === points[1] ? s.mano : points[0] > points[1] ? 0 : 1;
                s.envidoResult = {
                    winner,
                    score: points[winner],
                    prize: pending.potAfter,
                    cards: (0, hand_1.envidoCards)(scores[winner]),
                };
                s.envidoStatus = 'accepted';
                s.pending = null;
                const detail = scores[winner].pair
                    ? ` (${scores[winner].pair.map(hand_1.cardLabel).join(' y ')})`
                    : '';
                s.lastEvent = `Envido ${points[winner]}${detail} · ${types_1.PLAYER_NAMES[winner]}: +${pending.potAfter}`;
                this.log(s.lastEvent);
                this.restoreDeferredTruco();
                return true;
            }
            case 'declineEnvido': {
                if (s.pending?.kind !== 'envido')
                    return false;
                const { by: caller, decline } = s.pending;
                s.pending = null;
                s.envidoStatus = 'declined';
                s.lastEvent = `Puntos para ${types_1.PLAYER_NAMES[caller]}: ${decline}`;
                this.log(s.lastEvent);
                this.award(caller, decline);
                this.checkGameEnd();
                this.restoreDeferredTruco();
                return true;
            }
            case 'fold': {
                const winner = (0, types_1.other)(player);
                // Antes de cerrar el turno del envido, abandonar cuesta envido + truco.
                const mazoPoints = (0, hand_1.trucoPoints)(s.trucoLevel) + (this.canOpenEnvido(player) ? 1 : 0);
                s.lastEvent = `Mazo: ${types_1.PLAYER_NAMES[player]}`;
                this.log(s.lastEvent);
                this.finishHand(winner, mazoPoints, 'mazo');
                return true;
            }
            case 'nextHand':
                if (s.phase !== 'handEnd')
                    return false;
                s.handNumber += 1;
                s.mano = (0, types_1.other)(s.mano);
                this.startHand();
                return true;
            case 'restart':
                if (s.phase !== 'gameEnd')
                    return false;
                this.state = this.createInitialState();
                this.startHand();
                return true;
            default:
                return false;
        }
    }
    resolveRound() {
        const s = this.state;
        const winner = this.roundWinner(s.round);
        if (winner === null) {
            s.lastEvent = `Ronda ${s.round + 1}: parda`;
        }
        else {
            s.roundWins[winner] += 1;
            s.roundPoints[winner] += 1;
            s.lastEvent = `Ronda ${s.round + 1} · ${types_1.PLAYER_NAMES[winner]}`;
        }
        this.log(s.lastEvent);
        s.turn = winner ?? s.mano;
        s.round += 1;
        if (this.handIsDecided())
            this.finishHandByRounds();
    }
    /**
     * Pardas según el reglamento: si empatan las dos primeras, decide la tercera;
     * si empatan las tres, gana el mano. Si se empata la segunda gana quien ganó la primera.
     */
    handIsDecided() {
        const s = this.state;
        if (s.round >= 3)
            return true;
        if (s.round < 2)
            return false;
        const first = this.roundWinner(0);
        const second = this.roundWinner(1);
        if (first === null)
            return second !== null;
        if (second === null)
            return true;
        return first === second;
    }
    decideHandWinner() {
        const s = this.state;
        const first = this.roundWinner(0);
        const second = this.roundWinner(1);
        const third = this.roundWinner(2);
        if (first !== null) {
            if (second === null || second === first)
                return first;
            return third ?? first; // parda en la tercera: vuelve a quien ganó la primera
        }
        if (second !== null)
            return second; // parda en la primera: decide la segunda
        return third ?? s.mano; // tres pardas: gana el mano
    }
    finishHandByRounds() {
        const s = this.state;
        const handWinner = this.decideHandWinner();
        const pardas = [0, 1, 2].filter((round) => this.roundWinner(round) === null).length;
        const reason = pardas === 3 ? 'tres pardas (mano)' : pardas > 0 ? 'parda' : 'mano';
        this.finishHand(handWinner, (0, hand_1.trucoPoints)(s.trucoLevel), reason);
    }
    finishHand(handWinner, handPoints, reason) {
        const s = this.state;
        const envido = s.envidoResult;
        const breakdown = envido
            ? { winner: envido.winner, score: envido.score, prize: envido.prize, cards: envido.cards }
            : undefined;
        // El envido se anota primero: si él solo define la partida, manda su resultado.
        if (envido)
            this.award(envido.winner, envido.prize);
        s.lastHand = {
            winner: handWinner,
            points: handPoints,
            reason,
            envido: breakdown,
            truco: { winner: handWinner, points: handPoints },
        };
        this.checkGameEnd();
        if (s.phase !== 'gameEnd') {
            this.award(handWinner, handPoints);
            this.checkGameEnd();
        }
        if (s.phase !== 'gameEnd')
            s.phase = 'handEnd';
        const parts = [];
        if (envido)
            parts.push(`envido: ${types_1.PLAYER_NAMES[envido.winner]} +${envido.prize}`);
        parts.push(`${reason}: ${types_1.PLAYER_NAMES[handWinner]} +${handPoints}`);
        s.lastEvent = parts.join(' · ');
        this.log(s.lastEvent);
    }
    award(player, points) {
        this.state.scores[player] += points;
    }
    checkGameEnd() {
        const s = this.state;
        if (s.scores[0] >= s.targetScore || s.scores[1] >= s.targetScore) {
            s.phase = 'gameEnd';
            s.winner = s.scores[0] >= s.targetScore ? 0 : 1;
            s.lastEvent = `¡${types_1.PLAYER_NAMES[s.winner]} gana la partida!`;
            this.log(s.lastEvent);
        }
    }
    roundWinner(roundIndex) {
        const round = this.state.played[roundIndex];
        if (!round || !round[0] || !round[1])
            return null;
        const diff = (0, hand_1.cardStrength)(round[0]) - (0, hand_1.cardStrength)(round[1]);
        return diff > 0 ? 0 : diff < 0 ? 1 : null;
    }
    /** Envido del jugador, para la IA y la interfaz. */
    envidoFor(player) {
        return (0, hand_1.envidoScore)(this.state.hands[player]).points;
    }
    /** Fuerza de la mano (suma de las 2 mejores cartas), para la IA. */
    handStrength(player) {
        const strengths = this.state.hands[player].map(hand_1.cardStrength).sort((a, b) => b - a);
        return strengths[0] + strengths[1];
    }
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    /** Carta jugada por el rival en la ronda actual, si ya la tiró. */
    currentOpponentCard(player) {
        return this.state.played[Math.min(this.state.round, 2)][(0, types_1.other)(player)];
    }
    bestValueInHand(player) {
        return this.state.hands[player].reduce((max, card) => Math.max(max, card.rank <= 7 ? card.rank : 0), 0);
    }
}
exports.TrucoGame = TrucoGame;
