"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUIT_SHORT = exports.SUIT_LABELS = void 0;
exports.cardValue = cardValue;
exports.cardStrength = cardStrength;
exports.compareCards = compareCards;
exports.envidoScore = envidoScore;
exports.trucoPoints = trucoPoints;
exports.declinePoints = declinePoints;
exports.cardLabel = cardLabel;
exports.sortHand = sortHand;
exports.strongestCards = strongestCards;
exports.isMano = isMano;
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
const SPECIALS = [
    { rank: 1, suit: 'espada' },
    { rank: 1, suit: 'basto' },
    { rank: 7, suit: 'espada' },
    { rank: 7, suit: 'oro' },
    { rank: 1, suit: 'oro' },
    { rank: 7, suit: 'copa' },
    { rank: 7, suit: 'basto' },
];
/** Valor de envido de una carta: las figuras valen 0. */
function cardValue(card) {
    return card.rank <= 7 ? card.rank : 0;
}
/**
 * Fuerza relativa de la carta para resolver una ronda.
 * Empates: mismo número (o todas las figuras del mismo valor).
 */
function cardStrength(card) {
    const special = SPECIALS.findIndex((s) => s.rank === card.rank && s.suit === card.suit);
    if (special >= 0)
        return 100 - special; // 100..94
    if (card.rank >= 2 && card.rank <= 6)
        return 80 + card.rank; // 86..82
    if (card.rank === 1 && card.suit === 'copa')
        return 81; // 1 de copa, después del 2
    if (card.rank === 12)
        return 40;
    if (card.rank === 11)
        return 30;
    return 20; // 10
}
function compareCards(a, b) {
    return cardStrength(a) - cardStrength(b);
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
function trucoPoints(level) {
    return level === 0 ? 1 : level;
}
function declinePoints(kind, level) {
    if (kind === 'envido')
        return level === 1 ? 1 : 2;
    return level;
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
