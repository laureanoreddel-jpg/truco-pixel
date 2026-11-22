import { chooseAiAction, makeStoryProfile, profileFor, type Difficulty } from '../core/ai';
import { TrucoGame } from '../core/game';
import {
  isStoryUnlocked,
  loadStoryProgress,
  markStoryWin,
  saveStoryProgress,
  STORY_OPPONENTS,
} from '../core/story';
import { other, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import { AudioFx } from './audio';
import { NetClient, type ServerMessage } from './net';
import { Renderer, type HitBox, type JoinInput } from './renderer';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const renderer = new Renderer(ctx, canvas.width, canvas.height);
const audio = new AudioFx();
const net = new NetClient();

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: las preferencias viven solo en esta sesión.
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nada que limpiar.
  }
}

/** El token de sala es por pestaña: dos pestañas no deben pelearse por el mismo asiento. */
function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Sin sesión: la partida sigue mientras la pestaña esté abierta.
  }
}

function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nada que limpiar.
  }
}

audio.enabled = storageGet('truco-sonido') !== 'off';

function savedDifficulty(): Difficulty {
  const value = storageGet('truco-dificultad');
  return value === 'facil' || value === 'medio' || value === 'dificil' ? value : 'medio';
}

type Screen = 'menu' | 'online' | 'story' | 'storyIntro' | 'storyResult' | 'game' | 'help';
type Mode = 'local' | 'online' | 'story';

let screen: Screen = 'menu';
let mode: Mode = 'local';
let difficulty: Difficulty = savedDifficulty();
let storyProgress = loadStoryProgress();
let storyIndex = Math.min(storyProgress, STORY_OPPONENTS.length - 1);
let storyWon = false;
let storyResultTimer: number | undefined;
let game: TrucoGame | null = null;
let human: PlayerIndex = 0;
let legal: GameAction[] = [];
let hits: HitBox[] = [];
let notice = '';
let hover: string | null = null;
let helpReturn: Screen = 'menu';
let helpPage = 0;
let noticeTimer: number | undefined;
let aiTimer: number | undefined;
let room = { code: '', status: 'Conectando al servidor...', connected: false, token: '' };
let joinInput: JoinInput = { active: false, value: '' };
let storyTaunt = '';
let tauntTimer: number | undefined;
let reconnectTimer: number | undefined;
let reconnectAttempts = 0;
const srStatus = document.getElementById('sr-status');
let lastAnnouncement = '';

function setNotice(text: string): void {
  notice = text;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice = '';
  }, 1800);
}

/** Anuncia el estado en un region aria-live sin llenar la pantalla de texto. */
function announce(text: string): void {
  if (!srStatus || text === lastAnnouncement) return;
  lastAnnouncement = text;
  srStatus.textContent = text;
}

function render(): void {
  if (screen === 'menu') {
    hits = renderer.drawMenu(difficulty, hover, audio.enabled);
  } else if (screen === 'online') {
    hits = renderer.drawOnline(room, hover, joinInput);
  } else if (screen === 'help') {
    hits = renderer.drawHelp(hover, helpPage);
  } else if (screen === 'story') {
    hits = renderer.drawStoryMap(storyProgress, storyIndex, hover);
  } else if (screen === 'storyIntro') {
    hits = renderer.drawStoryIntro(STORY_OPPONENTS[storyIndex], storyIndex, hover);
  } else if (screen === 'storyResult') {
    hits = renderer.drawStoryResult(STORY_OPPONENTS[storyIndex], storyIndex, storyWon, storyProgress, hover);
  } else if (game) {
    hits = renderer.drawGame(game.getState(), {
      human,
      mode,
      legal,
      notice,
      hover,
      opponent: mode === 'story' ? STORY_OPPONENTS[storyIndex] : undefined,
      sound: audio.enabled,
      taunt: storyTaunt,
    });
  }

  if (screen === 'game' && game) {
    const s = game.state;
    const status = s.phase === 'handEnd'
      ? 'Mano terminada'
      : s.phase === 'gameEnd'
        ? 'Partida terminada'
        : s.pending
          ? 'Hay un canto esperando respuesta'
          : s.turn === human
            ? 'Tu turno'
            : 'Turno del rival';
    announce(`${status}. Vos ${s.scores[human]}, rival ${s.scores[other(human)]}.`);
  } else {
    announce(`Pantalla ${screen}`);
  }
}

function updateLegal(): void {
  legal = game ? game.legalActions(human) : [];
}

function cancelReconnect(): void {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
}

function clearTaunt(): void {
  if (tauntTimer) window.clearTimeout(tauntTimer);
  tauntTimer = undefined;
  storyTaunt = '';
}

function stopAi(): void {
  if (aiTimer) window.clearTimeout(aiTimer);
  aiTimer = undefined;
  clearTaunt();
}

function startLocal(): void {
  stopAi();
  hover = null;
  mode = 'local';
  human = 0;
  game = new TrucoGame(Date.now());
  screen = 'game';
  updateLegal();
  audio.click();
  render();
}

function goStoryMap(): void {
  stopAi();
  if (storyResultTimer) window.clearTimeout(storyResultTimer);
  storyResultTimer = undefined;
  hover = null;
  screen = 'story';
  mode = 'local';
  game = null;
  storyIndex = Math.min(storyIndex, STORY_OPPONENTS.length - 1);
  render();
}

function openStoryIntro(index: number): void {
  if (!isStoryUnlocked(storyProgress, index)) return;
  stopAi();
  hover = null;
  storyIndex = index;
  screen = 'storyIntro';
  render();
}

function startStoryGame(index: number): void {
  if (!isStoryUnlocked(storyProgress, index)) return;
  stopAi();
  hover = null;
  mode = 'story';
  human = 0;
  storyIndex = index;
  game = new TrucoGame(Date.now());
  screen = 'game';
  updateLegal();
  audio.click();
  render();
  scheduleAi();
}

function scheduleAi(): void {
  stopAi();
  if (!game || (mode !== 'local' && mode !== 'story')) return;
  const s = game.state;
  // El cierre de mano lo decide el jugador con el botón "SIGUIENTE MANO".
  if (s.phase === 'gameEnd' || s.phase === 'handEnd') return;
  const responder = s.pending ? other(s.pending.by) : s.turn;
  if (responder === human && s.phase === 'playing') return;

  aiTimer = window.setTimeout(() => {
    aiTimer = undefined;
    if (!game || (mode !== 'local' && mode !== 'story')) return;
    const player = game.state.pending ? other(game.state.pending.by) : game.state.turn;
    const rival = STORY_OPPONENTS[storyIndex];
    const level = mode === 'story' ? makeStoryProfile(rival.difficulty, rival.profile ?? {}) : profileFor(difficulty);
    const action = chooseAiAction(game, player, level);
    if (mode === 'story') {
      const truco = action.type === 'callTruco' || action.type === 'raiseTruco';
      const envido = action.type === 'callEnvido' || action.type === 'callRealEnvido'
        || action.type === 'callEnvidoEnvido' || action.type === 'callFalta';
      if (truco || envido) {
        const pool = STORY_OPPONENTS[storyIndex].taunts[truco ? 'truco' : 'envido'];
        storyTaunt = pool[Math.floor(Math.random() * pool.length)] ?? '';
        if (tauntTimer) window.clearTimeout(tauntTimer);
        tauntTimer = window.setTimeout(() => {
          storyTaunt = '';
          tauntTimer = undefined;
          render();
        }, 1500);
      }
    }
    if (game.dispatch(player, action)) afterAction(action);
    scheduleAi();
  }, 620);
}

function afterAction(action: GameAction): void {
  updateLegal();
  if (action.type === 'playCard') audio.card();
  else if (action.type === 'callTruco' || action.type === 'raiseTruco' || action.type === 'acceptTruco') audio.truco();
  if (game?.state.phase === 'gameEnd') {
    const won = game.state.winner === human;
    if (won) audio.win();
    else audio.lose();
    if (mode === 'story' && screen === 'game') {
      storyWon = won;
      if (won) {
        storyProgress = markStoryWin(storyProgress, storyIndex);
        saveStoryProgress(storyProgress);
      }
      if (storyResultTimer) window.clearTimeout(storyResultTimer);
      storyResultTimer = window.setTimeout(() => {
        storyResultTimer = undefined;
        screen = 'storyResult';
        render();
      }, 1100);
    }
  }
  render();
}

function dispatchLocal(action: GameAction): void {
  if (!game || (mode !== 'local' && mode !== 'story')) return;
  if (game.dispatch(human, action)) {
    afterAction(action);
    scheduleAi();
  } else {
    setNotice('No podes hacer eso');
    render();
  }
}

function startOnline(): void {
  stopAi();
  cancelReconnect();
  reconnectAttempts = 0;
  storageRemove('truco-token'); // Versiones anteriores guardaban el token por origen.
  hover = null;
  joinInput = { active: false, value: '' };
  screen = 'online';
  mode = 'online';
  game = null;
  room = { code: '', status: 'Conectando al servidor...', connected: false, token: sessionGet('truco-token') ?? '' };
  net.onMessage = handleNetMessage;
  net.onClose = () => {
    cancelReconnect();
    if (screen !== 'online' && screen !== 'game') return;
    room.connected = false;
    if (reconnectAttempts >= 5) {
      room.status = 'Sin conexion. Volvé al menu e intentá de nuevo.';
      render();
      return;
    }
    reconnectAttempts += 1;
    room.status = `Reconectando... (${reconnectAttempts}/5)`;
    render();
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      if (screen !== 'online' && screen !== 'game') return;
      net.connect(room.token || sessionGet('truco-token') || undefined);
    }, 900);
  };
  net.connect(room.token || undefined);
  render();
}

function handleNetMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'welcome': {
      cancelReconnect();
      reconnectAttempts = 0;
      human = message.player;
      room.code = message.code;
      room.token = message.token;
      room.status = message.player === 0 ? 'Esperando al rival...' : 'Conectado';
      sessionSet('truco-token', message.token);
      if (message.state) {
        game = new TrucoGame(1);
        game.state = message.state;
        screen = 'game';
        mode = 'online';
        updateLegal();
        const done = (state: GameState) => {
          if (state.phase === 'gameEnd') {
            if (state.winner === human) audio.win();
            else audio.lose();
          }
        };
        done(message.state);
      }
      render();
      break;
    }
    case 'state': {
      cancelReconnect();
      reconnectAttempts = 0;
      const previousEvent = game?.state.lastEvent;
      game = new TrucoGame(1);
      game.state = message.state;
      screen = 'game';
      mode = 'online';
      updateLegal();
      if (message.state.phase === 'gameEnd') {
        if (message.state.winner === human) audio.win();
        else audio.lose();
      } else if (previousEvent !== message.state.lastEvent) {
        if (previousEvent !== undefined) audio.click();
      }
      render();
      break;
    }
    case 'opponent':
      room.connected = message.connected;
      room.status = message.connected ? 'Rival conectado' : 'Esperando al rival...';
      render();
      break;
    case 'error':
      room.status = message.message;
      if (message.message.startsWith('Sesión vencida')) {
        sessionRemove('truco-token');
        room.token = '';
      }
      setNotice(message.message);
      render();
      break;
  }
}

function dispatchOnline(action: GameAction): void {
  if (!net.action(action)) setNotice('Sin conexion');
}

function goMenu(): void {
  stopAi();
  cancelReconnect();
  if (storyResultTimer) window.clearTimeout(storyResultTimer);
  storyResultTimer = undefined;
  net.close();
  sessionRemove('truco-token');
  hover = null;
  joinInput = { active: false, value: '' };
  screen = 'menu';
  game = null;
  render();
}

function confirmJoin(code: string): void {
  joinInput = { active: false, value: '' };
  room.status = `Uniendose a ${code}...`;
  if (!net.join(code)) room.status = 'Primero conectate al servidor';
  render();
}

function handleHit(id: string): void {
  audio.click();
  if (id.startsWith('diff:')) {
    difficulty = id.slice(5) as Difficulty;
    storageSet('truco-dificultad', difficulty);
    render();
    return;
  }
  if (id === 'menu:sound' || id === 'game:sound') {
    audio.enabled = !audio.enabled;
    storageSet('truco-sonido', audio.enabled ? 'on' : 'off');
    if (audio.enabled) audio.click();
    render();
    return;
  }
  if (id === 'menu:story') return goStoryMap();
  if (id === 'menu:local') return startLocal();
  if (id === 'menu:online') return startOnline();
  if (id.startsWith('story:select:')) {
    const index = Number(id.slice(13));
    if (isStoryUnlocked(storyProgress, index)) {
      storyIndex = index;
      render();
    }
    return;
  }
  if (id === 'story:play') return openStoryIntro(storyIndex);
  if (id === 'story:start') return startStoryGame(storyIndex);
  if (id === 'story:map') return goStoryMap();
  if (id === 'story:retry') return openStoryIntro(storyIndex);
  if (id === 'story:next') return openStoryIntro(Math.min(STORY_OPPONENTS.length - 1, storyIndex + 1));
  if (id === 'menu:help' || id === 'game:help') {
    helpReturn = screen;
    screen = 'help';
    render();
    return;
  }
  if (id === 'help:prev' || id === 'help:next') {
    helpPage = (helpPage + (id === 'help:next' ? 1 : Renderer.pageCount() - 1)) % Renderer.pageCount();
    render();
    return;
  }
  if (id === 'help:back') {
    screen = helpReturn;
    render();
    return;
  }
  if (id === 'online:create') {
    room.status = 'Creando sala...';
    if (!net.create()) room.status = 'Primero conectate al servidor';
    render();
    return;
  }
  if (id === 'online:join') {
    joinInput = { active: true, value: '' };
    render();
    return;
  }
  if (id === 'online:joinCancel') {
    joinInput = { active: false, value: '' };
    render();
    return;
  }
  if (id === 'online:joinConfirm') {
    const code = joinInput.value.trim().toUpperCase();
    if (code.length < 4) {
      room.status = 'El codigo necesita al menos 4 letras';
      render();
      return;
    }
    confirmJoin(code);
    return;
  }
  if (id === 'online:copy') {
    void navigator.clipboard?.writeText(room.code);
    room.status = 'Codigo copiado';
    render();
    return;
  }
  if (id === 'online:back') return goMenu();
  if (id === 'game:menu') return goMenu();
  if (id.startsWith('card:')) {
    const cardId = id.slice(5);
    const action = { type: 'playCard', cardId } satisfies GameAction;
    if (mode === 'local' || mode === 'story') dispatchLocal(action);
    else dispatchOnline(action);
    return;
  }
  if (id.startsWith('action:')) {
    const type = id.slice(7) as GameAction['type'];
    const action = legal.find((a) => a.type === type);
    if (!action) return;
    if (mode === 'local' || mode === 'story') dispatchLocal(action);
    else dispatchOnline(action);
  }
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  for (let i = hits.length - 1; i >= 0; i--) {
    const hit = hits[i];
    if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
      handleHit(hit.id);
      return;
    }
  }
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const target = [...hits].reverse().find(
    (hit) => x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h,
  );
  const next = target?.id ?? null;
  if (next !== hover) {
    hover = next;
    render();
  }
});

canvas.addEventListener('pointerleave', () => {
  if (hover) {
    hover = null;
    render();
  }
});

window.addEventListener('keydown', (event) => {
  if (screen === 'online' && joinInput.active) {
    const letter = event.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      if (joinInput.value.length < 6) joinInput = { ...joinInput, value: joinInput.value + letter };
      render();
      return;
    }
    if (event.key === 'Backspace') {
      joinInput = { ...joinInput, value: joinInput.value.slice(0, -1) };
      render();
      return;
    }
    if (event.key === 'Enter') {
      const code = joinInput.value.trim().toUpperCase();
      if (code.length >= 4) confirmJoin(code);
      else {
        room.status = 'El codigo necesita al menos 4 letras';
        render();
      }
      return;
    }
    if (event.key === 'Escape') {
      joinInput = { active: false, value: '' };
      render();
    }
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'escape' && screen === 'help') {
    screen = helpReturn;
    render();
    return;
  }
  if (key === 'escape' && screen !== 'menu') {
    if (screen === 'storyIntro' || screen === 'storyResult') goStoryMap();
    else goMenu();
    return;
  }
  if (key === 'h') {
    if (screen === 'help') screen = helpReturn;
    else {
      helpReturn = screen;
      screen = 'help';
    }
    render();
    return;
  }
  if (screen === 'help' && (key === 'arrowleft' || key === 'arrowright')) {
    helpPage = (helpPage + (key === 'arrowright' ? 1 : Renderer.pageCount() - 1)) % Renderer.pageCount();
    render();
    return;
  }
  if (screen !== 'game' || !game) return;

  const cardIndex = ['1', '2', '3'].indexOf(key);
  if (cardIndex >= 0) {
    const card = game.state.hands[human][cardIndex];
    const action = card && legal.find((a) => a.type === 'playCard' && a.cardId === card.id);
    if (action) {
      if (mode === 'local' || mode === 'story') dispatchLocal(action);
      else dispatchOnline(action);
    }
    return;
  }

  const shortcuts: Record<string, GameAction['type'][]> = {
    e: ['acceptEnvido', 'callEnvido'],
    r: ['callRealEnvido'],
    d: ['callEnvidoEnvido'],
    f: ['callFalta'],
    t: ['acceptTruco', 'callTruco'],
    s: ['raiseTruco'],
    n: ['declineTruco', 'declineEnvido'],
    m: ['fold'],
    enter: ['nextHand', 'restart'],
    ' ': ['nextHand', 'restart'],
  };
  const types = shortcuts[key];
  if (!types) return;
  event.preventDefault();
  const action = types.map((type) => legal.find((a) => a.type === type)).find(Boolean);
  if (action) {
    if (mode === 'local' || mode === 'story') dispatchLocal(action);
    else dispatchOnline(action);
  }
});

function loop(): void {
  render();
  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
