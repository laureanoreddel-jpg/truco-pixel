import { createDeck } from './deck';
import { TrucoGame } from './game';
import { cardStrength, envidoRaisesFor, envidoScore, sortHand, trucoPoints } from './hand';
import {
  other,
  type Card,
  type GameAction,
  type GameState,
  type PlayerIndex,
  type TrucoLevel,
} from './types';

export type Difficulty = 'facil' | 'medio' | 'dificil';

/**
 * Personalidad configurable de la IA. Todos los campos son interpretables y
 * pueden ser ajustados por el modo historia sin tocar el código de decisión.
 */
export interface AiProfile {
  /** 0..1: frecuencia con la que fuerza cantos agresivos sin que la utilidad los justifique. */
  bluff: number;
  /** -1..1: positivo ama el envido (canta/acepta más), negativo lo evita. */
  envidoBias: number;
  /** 0..1: tolerancia a abandonar la mano; alto = se rinde antes. */
  foldTolerance: number;
  /** Cantidad de manos rivales simuladas por decisión. */
  samples: number;
  /** Ruido agregado a la utilidad de cada acción (en puntos aproximados). */
  noise: number;
  /** Nombre visible del perfil. */
  label: string;
}

/** Perfiles base, deliberadamente muy distintos entre sí. */
export const AI_PROFILES: Record<Difficulty, AiProfile> = {
  facil: { bluff: 0.6, envidoBias: -0.45, foldTolerance: 0.95, samples: 4, noise: 1.2, label: 'Fácil' },
  medio: { bluff: 0.14, envidoBias: 0.05, foldTolerance: 0.42, samples: 12, noise: 0.55, label: 'Medio' },
  dificil: { bluff: 0.03, envidoBias: 0.4, foldTolerance: 0.1, samples: 32, noise: 0.05, label: 'Difícil' },
};

/** Copia del perfil base: mutatearla no afecta a `AI_PROFILES`. */
export function profileFor(difficulty: Difficulty): AiProfile {
  return { ...AI_PROFILES[difficulty] };
}

/** Perfil para un rival de historia: parte de una dificultad y aplica overrides. */
export function makeStoryProfile(base: Difficulty, overrides: Partial<AiProfile>): AiProfile {
  return { ...AI_PROFILES[base], ...overrides };
}

const DECK = createDeck();

const ENVIDO_CALLS = new Set<GameAction['type']>([
  'callEnvido',
  'callRealEnvido',
  'callEnvidoEnvido',
  'callFalta',
]);
const AGGRESSIVE_CALLS = new Set<GameAction['type']>([
  'callTruco',
  'raiseTruco',
  ...ENVIDO_CALLS,
]);

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

/** Los perfiles de historia pueden venir con valores raros: los acotamos al usarlos. */
function sanitizeProfile(profile: AiProfile): AiProfile {
  return {
    bluff: clamp(profile.bluff, 0, 1, 0),
    envidoBias: clamp(profile.envidoBias, -1, 1, 0),
    foldTolerance: clamp(profile.foldTolerance, 0, 1, 0.5),
    samples: Math.floor(clamp(profile.samples, 1, 64, 8)),
    noise: clamp(profile.noise, 0, 8, 0),
    label: typeof profile.label === 'string' ? profile.label : 'IA',
  };
}

function copyState(state: GameState): GameState {
  // El estado es pequeño y puramente serializable; esto evita olvidar campos nuevos.
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Fuerza aproximada de una mano: las dos mejores cartas (una sola carta se penaliza). */
function handPower(cards: Card[]): number {
  if (cards.length === 0) return 0;
  const values = cards.map(cardStrength).sort((a, b) => b - a);
  return values[0] + (values.length > 1 ? values[1] : 60);
}

function winsEnvido(state: GameState, player: PlayerIndex): boolean {
  const mine = envidoScore(state.hands[player]).points;
  const theirs = envidoScore(state.hands[other(player)]).points;
  return mine > theirs || (mine === theirs && state.mano === player);
}

function isEnvidoCall(action: GameAction): boolean {
  return ENVIDO_CALLS.has(action.type);
}

function sameAction(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type) return false;
  return a.type !== 'playCard' || b.type !== 'playCard' || a.cardId === b.cardId;
}

/** Muestrea manos rivales del mazo conocido (lo que no tengo yo ni está jugado). */
function sampleRivalHands(
  state: GameState,
  player: PlayerIndex,
  samples: number,
  rng: () => number,
): Card[][] {
  const rival = other(player);
  const known = new Set<string>();
  for (const card of state.hands[player]) known.add(card.id);
  for (const round of state.played) {
    for (const card of round) if (card) known.add(card.id);
  }
  const pool = DECK.filter((card) => !known.has(card.id));
  const size = Math.min(state.hands[rival].length, pool.length);
  const result: Card[][] = [];
  for (let sample = 0; sample < samples; sample++) {
    const remaining = pool.slice();
    const hand: Card[] = [];
    for (let i = 0; i < size; i++) {
      const j = i + Math.floor(clamp(rng(), 0, 0.999999999, 0) * (remaining.length - i));
      const swap = remaining[i];
      remaining[i] = remaining[j];
      remaining[j] = swap;
      hand.push(remaining[i]);
    }
    result.push(hand);
  }
  return result;
}

/**
 * Cuando ya se resolvió un envido, sus tantos son información pública: las manos
 * imaginadas del rival tienen que respetar lo que ya se sabe de ellas.
 */
function filterSamplesByEnvido(
  hands: Card[][],
  state: GameState,
  player: PlayerIndex,
): Card[][] {
  const result = state.envidoResult;
  if (!result) return hands;
  const rivalWon = result.winner === other(player);
  // Si el rival ganó, su envido es exactamente el cantado. Si perdió, no puede superarlo.
  return hands.filter((hand) => {
    const value = envidoScore(hand).points;
    return rivalWon ? value === result.score : value <= result.score;
  });
}

/** Utilidad de un cierre de mano: diferencia de puntos + valor de ganar/perder la partida. */
function finalUtility(state: GameState, player: PlayerIndex, startScores: [number, number]): number {
  const rival = other(player);
  const gained = state.scores[player] - startScores[player];
  const conceded = state.scores[rival] - startScores[rival];
  const pressure = 1 + (startScores[0] + startScores[1]) / (2 * state.targetScore);
  let value = (gained - conceded) * pressure;
  const playerWon = state.scores[player] >= state.targetScore;
  const rivalWon = state.scores[rival] >= state.targetScore;
  if (playerWon && !rivalWon) value += 8;
  if (rivalWon && !playerWon) value -= 8;
  return value;
}

/** Valor de una posición no cerrada (solo por seguridad, el playout suele cerrar). */
function heuristicUtility(state: GameState, player: PlayerIndex): number {
  const rival = other(player);
  const level = trucoPoints(state.trucoLevel);
  const wins = state.roundWins[player] - state.roundWins[rival];
  let probability = 0.5 + (state.mano === player ? 0.05 : -0.05);
  if (state.roundWins[player] >= 2) probability = 1;
  else if (state.roundWins[rival] >= 2) probability = 0;
  else if (wins > 0) probability = 0.75;
  else if (wins < 0) probability = 0.25;
  let value = (probability * 2 - 1) * level + wins * 0.2;
  if (state.envidoResult) {
    value += (state.envidoResult.winner === player ? 1 : -1) * state.envidoResult.prize;
  }
  return value;
}

function pickEnvidoRaise(
  legal: GameAction[],
  envido: number,
  winning: boolean,
  bids: GameState['envidoBids'],
  profile: AiProfile,
): GameAction | null {
  // La legalidad de la suba ya la asegura el motor; acá sólo elegimos la mejor.
  if (!winning || envido < 31 || envidoRaisesFor(bids).length === 0) return null;
  const has = (type: GameAction['type']) => legal.some((action) => action.type === type);
  if (has('callFalta') && envido >= 33) return { type: 'callFalta' };
  if (has('callEnvidoEnvido') && envido >= 32) return { type: 'callEnvidoEnvido' };
  if (has('callRealEnvido') && envido >= 31 && profile.envidoBias > -0.2) return { type: 'callRealEnvido' };
  if (has('callEnvido') && envido >= 33) return { type: 'callEnvido' };
  return null;
}

/** Política greedy usada dentro de las simulaciones (barata y determinista). */
function chooseCard(state: GameState, player: PlayerIndex, legal: GameAction[]): GameAction {
  const playable = legal.filter((action) => action.type === 'playCard');
  if (playable.length === 0) return legal[0];
  const cards = playable
    .map((action) => state.hands[player].find((card) => card.id === (action as { cardId: string }).cardId))
    .filter((card): card is Card => Boolean(card));
  if (cards.length === 0) return playable[0];

  const rival = other(player);
  const rivalCard = state.played[Math.min(state.round, 2)][rival];
  if (rivalCard) {
    const rivalStrength = cardStrength(rivalCard);
    let cheapestWinner: Card | null = null;
    let cheapest = cards[0];
    for (const card of cards) {
      const strength = cardStrength(card);
      if (strength < cardStrength(cheapest)) cheapest = card;
      if (strength > rivalStrength && (!cheapestWinner || strength < cardStrength(cheapestWinner))) {
        cheapestWinner = card;
      }
    }
    return { type: 'playCard', cardId: (cheapestWinner ?? cheapest).id };
  }

  // Abriendo la ronda: si tengo una carta imbatible, la uso; si no, gasto la menor.
  const sorted = sortHand(cards);
  const rivalRemaining = state.hands[rival];
  let unbeatable: Card | null = null;
  for (const card of sorted) {
    if (rivalRemaining.every((rivalCardInHand) => cardStrength(card) > cardStrength(rivalCardInHand))) {
      unbeatable = card;
    }
  }
  if (unbeatable) return { type: 'playCard', cardId: unbeatable.id };
  const strongCards = sorted.filter((card) => cardStrength(card) >= 165);
  if (strongCards.length >= 2) {
    return { type: 'playCard', cardId: strongCards[strongCards.length - 1].id };
  }
  return { type: 'playCard', cardId: sorted[sorted.length - 1].id };
}

function responseToTruco(
  state: GameState,
  legal: GameAction[],
  player: PlayerIndex,
  profile: AiProfile,
): GameAction {
  const pending = state.pending;
  const level: TrucoLevel = pending?.kind === 'truco' ? pending.level : (state.trucoLevel || 1);
  const rival = other(player);
  const power = handPower(state.hands[player]);
  const wins = state.roundWins[player];
  const rivalWins = state.roundWins[rival];
  const rivalCard = state.played[Math.min(state.round, 2)][rival];
  const canWinNow = Boolean(
    rivalCard && state.hands[player].some((card) => cardStrength(card) > cardStrength(rivalCard)),
  );

  if (legal.some((action) => action.type === 'raiseTruco') && level < 3) {
    const raiseNeed = (level === 1 ? 350 : 365) - profile.bluff * 40;
    if (power >= raiseNeed) return { type: 'raiseTruco' };
  }

  const acceptNeed =
    (level === 1 ? 305 : level === 2 ? 340 : 370) +
    profile.foldTolerance * 22 -
    profile.envidoBias * 4;
  if (
    power >= acceptNeed ||
    (wins >= 1 && wins > rivalWins && canWinNow) ||
    (wins >= 1 && power >= acceptNeed - 35)
  ) {
    return { type: 'acceptTruco' };
  }
  return { type: 'declineTruco' };
}

function responseToEnvido(
  state: GameState,
  legal: GameAction[],
  player: PlayerIndex,
  profile: AiProfile,
): GameAction {
  const pending = state.pending;
  if (pending?.kind !== 'envido') return { type: 'declineEnvido' };
  const envido = envidoScore(state.hands[player]).points;
  const winning = winsEnvido(state, player);
  const pot = pending.potAfter;
  const cheap = pot <= pending.bids.length * 2 + 1 + profile.envidoBias * 3 - profile.foldTolerance * 2;
  const strong = envido >= 33 + profile.envidoBias * 4 - profile.foldTolerance * 4;
  if (!winning && !cheap && !strong) return { type: 'declineEnvido' };
  const raise = pickEnvidoRaise(legal, envido, winning, pending.bids, profile);
  return raise ?? { type: 'acceptEnvido' };
}

function turnAction(
  state: GameState,
  legal: GameAction[],
  player: PlayerIndex,
  profile: AiProfile,
): GameAction {
  const rival = other(player);
  const power = handPower(state.hands[player]);

  if (
    state.trucoLevel > 0 &&
    legal.some((action) => action.type === 'fold') &&
    power < 235 + profile.foldTolerance * 30 &&
    state.roundWins[rival] >= 1
  ) {
    return { type: 'fold' };
  }

  if (legal.some((action) => action.type === 'callEnvido')) {
    const envido = envidoScore(state.hands[player]).points;
    if (envido >= 32 + profile.envidoBias * 3) {
      const raise = pickEnvidoRaise(legal, envido, true, state.envidoBids, profile);
      return raise ?? { type: 'callEnvido' };
    }
  }

  if (
    state.trucoLevel === 0 &&
    legal.some((action) => action.type === 'callTruco') &&
    power >= 315 - profile.bluff * 50
  ) {
    return { type: 'callTruco' };
  }
  if (
    state.trucoLevel > 0 &&
    state.trucoLevel < 3 &&
    state.trucoCaller !== player &&
    legal.some((action) => action.type === 'raiseTruco') &&
    power >= 340 - profile.bluff * 40
  ) {
    return { type: 'raiseTruco' };
  }
  return chooseCard(state, player, legal);
}

/** Elige una acción legal para el actor indicado dentro de una simulación. */
function greedyAction(sim: TrucoGame, player: PlayerIndex, profile: AiProfile): GameAction {
  const state = sim.state;
  if (state.phase === 'handEnd') return { type: 'nextHand' };
  if (state.phase === 'gameEnd') return { type: 'restart' };
  const legal = sim.legalActions(player);
  if (legal.length === 0) return { type: 'fold' };
  if (state.pending?.kind === 'truco') return responseToTruco(state, legal, player, profile);
  if (state.pending?.kind === 'envido') return responseToEnvido(state, legal, player, profile);
  return turnAction(state, legal, player, profile);
}

/** Completa la mano hasta el cierre con políticas greedies baratas. */
function playout(sim: TrucoGame, profile: AiProfile, maxSteps = 18): void {
  for (let step = 0; step < maxSteps; step++) {
    const state = sim.state;
    if (state.phase !== 'playing') return;
    const actor: PlayerIndex = state.pending ? other(state.pending.by) : state.turn;
    let action = greedyAction(sim, actor, profile);
    if (!sim.dispatch(actor, action)) {
      const legal = sim.legalActions(actor);
      action = legal.find((candidate) => candidate.type !== 'fold') ?? legal[0];
      if (!action || !sim.dispatch(actor, action)) return;
    }
  }
}

/** Orden de preferencia para fallbacks: carta, aceptar, lo demás. */
function preferLegal(legal: GameAction[], state: GameState, actor: PlayerIndex): GameAction {
  const play = legal.find((action) => action.type === 'playCard');
  if (play) return chooseCard(state, actor, legal);
  const order: GameAction['type'][] = [
    'acceptTruco',
    'acceptEnvido',
    'declineTruco',
    'declineEnvido',
    'callTruco',
    'raiseTruco',
    'callEnvido',
    'callRealEnvido',
    'callEnvidoEnvido',
    'callFalta',
    'fold',
    'nextHand',
    'restart',
  ];
  for (const type of order) {
    const found = legal.find((action) => action.type === type);
    if (found) return found;
  }
  return legal[0];
}

/** Cuando `player` no debe actuar, devolvemos una acción válida para quien corresponda. */
function fallbackLegalAction(game: TrucoGame, player: PlayerIndex): GameAction {
  const state = game.state;
  if (state.phase === 'gameEnd') return { type: 'restart' };
  if (state.phase === 'handEnd') return { type: 'nextHand' };
  const actor: PlayerIndex = state.pending ? other(state.pending.by) : state.turn;
  const legal = game.legalActions(actor);
  if (legal.length > 0) return preferLegal(legal, state, actor);
  const card = state.hands[player][0] ?? state.hands[actor][0];
  if (card) return { type: 'playCard', cardId: card.id };
  return { type: 'nextHand' };
}

/**
 * IA de truco: evalúa cada acción legal con simulaciones ligeras de manos
 * rivales y un playout greedy. Compatible con las dificultades de siempre y
 * con perfiles personalizados (por ejemplo, los rivales del modo historia).
 */
export function chooseAiAction(
  game: TrucoGame,
  player: PlayerIndex,
  difficulty: Difficulty | AiProfile,
  rng: () => number = Math.random,
): GameAction {
  const profile = sanitizeProfile(
    typeof difficulty === 'string' ? profileFor(difficulty) : difficulty,
  );
  const state = game.state;
  const legal = game.legalActions(player);

  if (state.phase === 'gameEnd') return { type: 'restart' };
  if (state.phase === 'handEnd') return { type: 'nextHand' };
  if (legal.length === 0) return fallbackLegalAction(game, player);
  if (legal.length === 1) return legal[0];

  const rival = other(player);
  const samples = filterSamplesByEnvido(
    sampleRivalHands(state, player, profile.samples, rng),
    state,
    player,
  );
  const scratch = new TrucoGame(0, game.targetScore);
  const startScores: [number, number] = [state.scores[0], state.scores[1]];
  const bluffing = rng() < profile.bluff;
  const myPower = handPower(state.hands[player]);
  let bestAction = legal[0];
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const action of legal) {
    let total = 0;
    let valid = 0;
    for (const rivalHand of samples) {
      const simulatedState = copyState(state);
      simulatedState.hands[rival] = rivalHand.slice();
      scratch.state = simulatedState;
      if (!scratch.dispatch(player, action)) continue;
      playout(scratch, profile);
      total +=
        scratch.state.phase === 'playing'
          ? heuristicUtility(scratch.state, player)
          : finalUtility(scratch.state, player, startScores);
      valid++;
    }

    let value = valid > 0 ? total / valid : Number.NEGATIVE_INFINITY;
    if (isEnvidoCall(action)) {
      value += profile.envidoBias * 1.4 + (myPower >= 320 ? 0.2 : 0);
    }
    if (action.type === 'fold') {
      value += profile.foldTolerance * 2.5 - Math.max(0, myPower - 300) / 25;
    }
    if ((action.type === 'callTruco' || action.type === 'raiseTruco') && myPower >= 320) {
      value += (myPower - 300) / 140;
    }
    if (bluffing && AGGRESSIVE_CALLS.has(action.type)) {
      value += 0.5 + 3 * profile.bluff;
    }
    if (action.type === 'playCard') value += 0.02;
    else if (action.type === 'acceptTruco' || action.type === 'acceptEnvido') value += 0.01;
    value += (rng() * 2 - 1) * profile.noise;

    if (value > bestValue) {
      bestValue = value;
      bestAction = action;
    }
  }

  // Nunca devolver una acción que el motor rechazaría.
  if (!legal.some((action) => sameAction(action, bestAction))) {
    return preferLegal(legal, state, player);
  }
  return bestAction;
}
