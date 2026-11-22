"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENVIDO_CALL_NAMES = exports.SUIT_SHORT = exports.SUIT_LABELS = void 0;
exports.cardValue = cardValue;
exports.cardStrength = cardStrength;
exports.compareCards = compareCards;
exports.strengthTier = strengthTier;
exports.envidoScore = envidoScore;
exports.trucoPoints = trucoPoints;
exports.declinePoints = declinePoints;
exports.envidoLevelForCall = envidoLevelForCall;
exports.envidoCallValue = envidoCallValue;
exports.envidoPotForBids = envidoPotForBids;
exports.envidoDecline = envidoDecline;
exports.envidoRaisesFor = envidoRaisesFor;
exports.envidoWordCount = envidoWordCount;
exports.envidoActionForCall = envidoActionForCall;
exports.callForEnvidoAction = callForEnvidoAction;
exports.cardLabel = cardLabel;
exports.sortHand = sortHand;
exports.strongestCards = strongestCards;
exports.isMano = isMano;
exports.envidoCards = envidoCards;
exports.SUIT_LABELS = {
    espada: 'espada',
    basto: 'basto',
    oro: 'oro',
    copa: 'copa',
};
exports.SUIT_SHORT = {
    espada: 'E',
    basto: 'B',
    oro: 'O',
    copa: 'C',
};
/** Valor de envido de una carta: las figuras valen 0. */
function cardValue(card) {
    return card.rank <= 7 ? card.rank : 0;
}
/**
 * Jerarquía del truco argentino (de mayor a menor):
 * 1 espada, 1 basto, 7 espada, 7 oro, 3, 2, 1 oro/copa, 12, 11, 10,
 * 7 copa/basto, 6, 5, 4. Las cartas del mismo escalón empatan.
 */
function cardStrength(card) {
    const { rank, suit } = card;
    if (rank === 1 && suit === 'espada')
        return 190;
    if (rank === 1 && suit === 'basto')
        return 185;
    if (rank === 7 && suit === 'espada')
        return 180;
    if (rank === 7 && suit === 'oro')
        return 175;
    if (rank === 3)
        return 170;
    if (rank === 2)
        return 165;
    if (rank === 1)
        return 160; // 1 de oro o copa
    if (rank === 12)
        return 150;
    if (rank === 11)
        return 140;
    if (rank === 10)
        return 130;
    if (rank === 7)
        return 120; // 7 de copa o basto
    if (rank === 6)
        return 110;
    if (rank === 5)
        return 100;
    return 90; // 4
}
function compareCards(a, b) {
    return cardStrength(a) - cardStrength(b);
}
const TIER_VALUES = [190, 185, 180, 175, 170, 165, 160, 150, 140, 130, 120, 110, 100, 90];
/** Puesto en la jerarquía: 1 = la carta más fuerte, 14 = la más débil. */
function strengthTier(card) {
    const index = TIER_VALUES.indexOf(cardStrength(card));
    return index < 0 ? 14 : index + 1;
}
/** Envido = 20 + las dos cartas del mismo palo más altas; sin pareja, la carta mayor. */
function envidoScore(hand) {
    let best = { points: 0, pair: null, highest: null };
    for (const card of hand) {
        if (!best.highest || cardValue(card) > cardValue(best.highest))
            best.highest = card;
    }
    for (let i = 0; i < hand.length; i++) {
        for (let j = i + 1; j < hand.length; j++) {
            const a = hand[i];
            const b = hand[j];
            if (a.suit !== b.suit)
                continue;
            const points = 20 + cardValue(a) + cardValue(b);
            if (points > best.points)
                best = { points, pair: [a, b], highest: best.highest };
        }
    }
    if (best.pair === null && best.highest)
        best.points = cardValue(best.highest);
    return best;
}
/** Mano sin canto = 1, truco = 2, retruco = 3, vale cuatro = 4. */
function trucoPoints(level) {
    return level === 0 ? 1 : level + 1;
}
/** Rechazar truco entrega el escalón anterior (1, 2 o 3). */
function declinePoints(kind, level) {
    if (kind === 'truco')
        return level;
    // Para envido se usa `envidoDecline` con la cadena completa; estos valores
    // son sólo el caso de un canto único (y el de falta directa).
    return level === 3 ? 2 : 1;
}
exports.ENVIDO_CALL_NAMES = {
    envido: 'ENVIDO',
    real: 'REAL ENVIDO',
    doble: 'ENVIDO ENVIDO',
    falta: 'FALTA ENVIDO',
};
function envidoLevelForCall(call) {
    return call === 'envido' ? 1 : call === 'real' ? 2 : call === 'doble' ? 3 : 4;
}
/** Cada palabra "envido" vale 2; el real vale 3; la falta reemplaza la bolsa. */
function envidoCallValue(call, scores, targetScore) {
    if (call === 'falta')
        return Math.max(1, targetScore - Math.max(scores[0], scores[1]));
    return call === 'real' ? 3 : 2;
}
/** Total de la bolsa: se suman los cantos, excepto la falta, que reemplaza. */
function envidoPotForBids(bids) {
    const last = bids[bids.length - 1];
    if (last?.call === 'falta')
        return last.value;
    return bids.reduce((total, bid) => total + bid.value, 0);
}
/** No quiero = lo que valía la cadena antes del último canto, o 1 si era el primero. */
function envidoDecline(bids) {
    if (bids.length <= 1)
        return 1;
    const before = bids.slice(0, -1);
    return Math.max(1, envidoPotForBids(before));
}
/**
 * Subas legales según los reglamentos de torneo (ARCAT / CASI): después de
 * envido O real envido hay cinco respuestas (quiero, envido, real, falta, no
 * quiero), y las mismas cinco se repiten tras responder con envido o real.
 * «Envido envido» es el segundo «envido» (2 + 2 = 4) y, como establece la
 * variante habitual, no se puede repetir una tercera vez. La falta es terminal
 * y reemplaza la bolsa.
 */
function envidoRaisesFor(bids) {
    if (bids.length === 0)
        return ['envido', 'real', 'falta'];
    const last = bids[bids.length - 1];
    if (last.call === 'falta')
        return [];
    const envidos = bids.filter((bid) => bid.call === 'envido').length;
    return envidos >= 2 ? ['real', 'falta'] : ['envido', 'real', 'falta'];
}
/** Cantidad de palabras «envido» cantadas hasta ahora. */
function envidoWordCount(bids) {
    return bids.filter((bid) => bid.call === 'envido').length;
}
/** Convierte un canto en la acción pública equivalente. */
function envidoActionForCall(call) {
    if (call === 'envido')
        return { type: 'callEnvido' };
    if (call === 'real')
        return { type: 'callRealEnvido' };
    if (call === 'doble')
        return { type: 'callEnvidoEnvido' };
    return { type: 'callFalta' };
}
function callForEnvidoAction(type) {
    if (type === 'callEnvido')
        return 'envido';
    if (type === 'callRealEnvido')
        return 'real';
    if (type === 'callEnvidoEnvido')
        return 'doble';
    if (type === 'callFalta')
        return 'falta';
    return null;
}
function cardLabel(card) {
    return `${card.rank} de ${exports.SUIT_LABELS[card.suit]}`;
}
function sortHand(hand) {
    return hand.slice().sort((a, b) => cardStrength(b) - cardStrength(a));
}
function strongestCards(hand) {
    return sortHand(hand);
}
function isMano(player, mano) {
    return player === mano;
}
function envidoCards(score) {
    return score.pair ? [...score.pair] : score.highest ? [score.highest] : [];
}
