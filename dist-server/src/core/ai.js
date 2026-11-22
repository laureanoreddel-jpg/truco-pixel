"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseAiAction = chooseAiAction;
const hand_1 = require("./hand");
const THRESHOLD = { facil: -18, medio: 0, dificil: 12 };
const RAISE = { facil: 196, medio: 188, dificil: 182 };
/** Heurística simple: decide envido/truco con umbrales y juega la carta más barata que gana. */
function chooseAiAction(game, player, difficulty) {
    const s = game.state;
    const adjust = THRESHOLD[difficulty];
    const rng = Math.random;
    if (s.pending) {
        if (s.pending.by === player)
            throw new Error('La IA no debe responder su propio desafío');
        if (s.pending.kind === 'truco') {
            const strength = game.handStrength(player);
            const level = s.pending.level;
            if (strength >= RAISE[difficulty] && level < 3 && s.trucoLevel < 3)
                return { type: 'raiseTruco' };
            const needed = (level === 1 ? 142 : 168) + adjust;
            if (strength >= needed)
                return { type: 'acceptTruco' };
            if (difficulty === 'facil' && rng() < 0.2)
                return { type: 'acceptTruco' };
            return { type: 'declineTruco' };
        }
        const envido = game.envidoFor(player);
        if (s.pending.level === 1 && envido >= 33 && rng() < (difficulty === 'facil' ? 0.3 : 0.7)) {
            return { type: 'callRealEnvido' };
        }
        const needed = s.pending.level === 1 ? 31 + adjust : 33 + Math.min(0, adjust);
        if (envido >= needed)
            return { type: 'acceptEnvido' };
        return { type: 'declineEnvido' };
    }
    if (s.phase === 'handEnd')
        return { type: 'nextHand' };
    if (s.phase === 'gameEnd')
        return { type: 'restart' };
    if (s.turn !== player)
        return { type: 'playCard', cardId: s.hands[player][0]?.id ?? '' };
    const played = game.cardsPlayed();
    const envido = game.envidoFor(player);
    if (played === 0 && (s.envidoStatus === 'open' || s.envidoStatus === 'called')) {
        if (envido >= 33 || (difficulty === 'dificil' && envido >= 32 && rng() < 0.5)) {
            return { type: 'callRealEnvido' };
        }
        if (envido >= 32 || (difficulty !== 'facil' && envido >= 31 && rng() < 0.35)) {
            return { type: 'callEnvido' };
        }
    }
    const strength = game.handStrength(player);
    if (strength >= 176 + adjust || (difficulty !== 'facil' && rng() < 0.08)) {
        if (s.trucoLevel === 0)
            return { type: 'callTruco' };
        if (s.trucoLevel < 3 && strength >= 182 + adjust)
            return { type: 'raiseTruco' };
    }
    if (s.trucoLevel === 1 && strength >= 192)
        return { type: 'raiseTruco' };
    const hand = (0, hand_1.sortHand)(s.hands[player]);
    const rivalCard = game.currentOpponentCard(player);
    if (rivalCard) {
        const winners = hand.filter((card) => (0, hand_1.cardStrength)(card) > (0, hand_1.cardStrength)(rivalCard));
        if (winners.length > 0) {
            // Gana con la carta más barata que alcanza.
            return { type: 'playCard', cardId: winners[winners.length - 1].id };
        }
        return { type: 'playCard', cardId: hand[hand.length - 1].id };
    }
    if (s.round === 2)
        return { type: 'playCard', cardId: hand[0].id };
    // De mentor: guarda la carta fuerte para la última ronda.
    const index = hand.length > 1 && strength >= 165 ? 1 : hand.length - 1;
    return { type: 'playCard', cardId: hand[Math.min(index, hand.length - 1)].id };
}
