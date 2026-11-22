"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrucoGame = void 0;
const deck_1 = require("./deck");
const hand_1 = require("./hand");
const types_1 = require("./types");
/**
 * Motor de truco argentino simplificado.
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
    startHand() {
        const deck = (0, deck_1.shuffle)((0, deck_1.createDeck)(), this.rng);
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
        s.envidoLevel = 0;
        s.envidoCaller = null;
        s.envidoResult = null;
        s.pending = null;
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
    roundIsTie(roundIndex) {
        const round = this.state.played[roundIndex];
        if (!round || !round[0] || !round[1])
            return false;
        return (0, hand_1.cardStrength)(round[0]) === (0, hand_1.cardStrength)(round[1]);
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
                return actions;
            }
            const actions = [{ type: 'acceptEnvido' }, { type: 'declineEnvido' }];
            if (s.pending.level < 2)
                actions.push({ type: 'callRealEnvido' });
            return actions;
        }
        if (s.turn !== player)
            return [];
        const actions = s.hands[player].map((card) => ({ type: 'playCard', cardId: card.id }));
        if (s.trucoLevel === 0)
            actions.push({ type: 'callTruco' });
        else if (s.trucoLevel < 3)
            actions.push({ type: 'raiseTruco' });
        if (this.cardsPlayed() === 0 && s.envidoStatus !== 'declined') {
            if (s.envidoStatus === 'open')
                actions.push({ type: 'callEnvido' });
            if (s.envidoStatus === 'open' || s.envidoStatus === 'called') {
                actions.push({ type: 'callRealEnvido' });
            }
        }
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
                this.log(`${types_1.PLAYER_NAMES[player]} juega ${card.rank} de ${card.suit}`);
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
                s.lastEvent = `${types_1.PLAYER_NAMES[player]} dice TRUCO`;
                this.log(s.lastEvent);
                return true;
            case 'raiseTruco': {
                const previous = s.pending?.kind === 'truco' ? s.pending.level : s.trucoLevel;
                if (previous >= 3)
                    return false;
                const level = (previous + 1);
                s.pending = { kind: 'truco', by: player, level };
                s.lastEvent = level === 2 ? 'RETRUCO' : 'VALE CUATRO';
                this.log(`${types_1.PLAYER_NAMES[player]} dice ${s.lastEvent}`);
                return true;
            }
            case 'acceptTruco': {
                if (s.pending?.kind !== 'truco')
                    return false;
                s.trucoLevel = s.pending.level;
                s.trucoCaller = s.pending.by;
                s.pending = null;
                s.lastEvent = `Truco por ${s.trucoLevel}`;
                this.log(s.lastEvent);
                return true;
            }
            case 'declineTruco': {
                if (s.pending?.kind !== 'truco')
                    return false;
                const caller = s.pending.by;
                const points = Math.max(1, s.trucoLevel);
                s.pending = null;
                s.lastEvent = `${types_1.PLAYER_NAMES[(0, types_1.other)(caller)]} no acepta: ${types_1.PLAYER_NAMES[caller]} gana ${points}`;
                this.finishHand(caller, points, 'truco rechazado');
                return true;
            }
            case 'callEnvido':
                if (this.cardsPlayed() > 0)
                    return false;
                s.envidoStatus = 'called';
                s.envidoLevel = 1;
                s.envidoCaller = player;
                s.pending = { kind: 'envido', by: player, level: 1 };
                s.lastEvent = `${types_1.PLAYER_NAMES[player]} dice ENVIDO`;
                this.log(s.lastEvent);
                return true;
            case 'callRealEnvido': {
                if (this.cardsPlayed() > 0)
                    return false;
                const level = 2;
                s.envidoStatus = 'called';
                s.envidoLevel = level;
                s.envidoCaller = player;
                s.pending = { kind: 'envido', by: player, level };
                s.lastEvent = `${types_1.PLAYER_NAMES[player]} dice REAL ENVIDO`;
                this.log(s.lastEvent);
                return true;
            }
            case 'acceptEnvido': {
                if (s.pending?.kind !== 'envido')
                    return false;
                const scores = [(0, hand_1.envidoScore)(s.hands[0]).points, (0, hand_1.envidoScore)(s.hands[1]).points];
                const winner = scores[0] === scores[1] ? s.mano : scores[0] > scores[1] ? 0 : 1;
                s.envidoResult = { winner, points: scores[winner] };
                s.envidoStatus = 'accepted';
                s.pending = null;
                s.lastEvent = `Envidio: ${types_1.PLAYER_NAMES[winner]} gana ${scores[winner]}`;
                this.log(s.lastEvent);
                return true;
            }
            case 'declineEnvido': {
                if (s.pending?.kind !== 'envido')
                    return false;
                const caller = s.pending.by;
                const points = s.pending.level === 1 ? 1 : 2;
                s.pending = null;
                s.envidoStatus = 'declined';
                s.lastEvent = `${types_1.PLAYER_NAMES[(0, types_1.other)(caller)]} no acepta: ${types_1.PLAYER_NAMES[caller]} gana ${points}`;
                this.log(s.lastEvent);
                this.award(caller, points);
                this.checkGameEnd();
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
        const round = s.played[s.round];
        const a = round[0];
        const b = round[1];
        const strengthA = (0, hand_1.cardStrength)(a);
        const strengthB = (0, hand_1.cardStrength)(b);
        const winner = strengthA > strengthB ? 0 : strengthB > strengthA ? 1 : null;
        const tiedBefore = s.round > 0 && this.roundIsTie(s.round - 1);
        if (winner === null) {
            s.lastEvent = `Ronda ${s.round + 1}: empate${tiedBefore ? ' (próxima vale doble)' : ''}`;
        }
        else {
            s.roundWins[winner] += 1;
            s.lastEvent = `Ronda ${s.round + 1}: gana ${types_1.PLAYER_NAMES[winner]}${tiedBefore ? ' x2' : ''}`;
        }
        this.log(s.lastEvent);
        s.turn = winner ?? s.mano;
        s.round += 1;
        if (s.round >= 3 || s.roundWins[0] >= 2 || s.roundWins[1] >= 2) {
            this.finishHandByRounds();
        }
    }
    finishHandByRounds() {
        const s = this.state;
        const [wins0, wins1] = s.roundWins;
        const handWinner = wins0 > wins1 ? 0 : wins1 > wins0 ? 1 : s.mano;
        const lastRound = s.round - 1;
        const tiedBefore = lastRound > 0 && this.roundIsTie(lastRound - 1);
        const handPoints = (0, hand_1.trucoPoints)(s.trucoLevel) * (tiedBefore ? 2 : 1);
        this.finishHand(handWinner, handPoints, tiedBefore ? 'mano doble' : 'mano');
    }
    finishHand(handWinner, handPoints, reason) {
        const s = this.state;
        if (s.envidoResult) {
            this.award(s.envidoResult.winner, s.envidoResult.points);
        }
        this.award(handWinner, handPoints);
        s.lastEvent = `${types_1.PLAYER_NAMES[handWinner]} se lleva ${handPoints} (${reason})`;
        this.log(s.lastEvent);
        this.checkGameEnd();
        if (s.phase !== 'gameEnd')
            s.phase = 'handEnd';
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
        return this.state.played[this.state.round][(0, types_1.other)(player)];
    }
    bestValueInHand(player) {
        return this.state.hands[player].reduce((max, card) => Math.max(max, (0, hand_1.cardValue)(card)), 0);
    }
}
exports.TrucoGame = TrucoGame;
