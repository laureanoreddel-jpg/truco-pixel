import { chooseAiAction, type Difficulty } from '../core/ai';
import { TrucoGame } from '../core/game';
import { other, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import { AudioFx } from './audio';
import { NetClient, type ServerMessage } from './net';
import { Renderer, type HitBox } from './renderer';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const renderer = new Renderer(ctx, canvas.width, canvas.height);
const audio = new AudioFx();
const net = new NetClient();

type Screen = 'menu' | 'online' | 'game' | 'help';
type Mode = 'local' | 'online';

let screen: Screen = 'menu';
let mode: Mode = 'local';
let difficulty: Difficulty = 'medio';
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

function setNotice(text: string): void {
  notice = text;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice = '';
  }, 1800);
}

function render(): void {
  if (screen === 'menu') {
    hits = renderer.drawMenu(difficulty, hover);
  } else if (screen === 'online') {
    hits = renderer.drawOnline(room, hover);
  } else if (screen === 'help') {
    hits = renderer.drawHelp(hover, helpPage);
  } else if (game) {
    hits = renderer.drawGame(game.getState(), { human, mode, legal, notice, hover });
  }
}

function updateLegal(): void {
  legal = game ? game.legalActions(human) : [];
}

function stopAi(): void {
  if (aiTimer) window.clearTimeout(aiTimer);
  aiTimer = undefined;
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

function scheduleAi(): void {
  stopAi();
  if (!game || mode !== 'local') return;
  const s = game.state;
  // El cierre de mano lo decide el jugador con el botón "SIGUIENTE MANO".
  if (s.phase === 'gameEnd' || s.phase === 'handEnd') return;
  const responder = s.pending ? other(s.pending.by) : s.turn;
  if (responder === human && s.phase === 'playing') return;

  aiTimer = window.setTimeout(() => {
    aiTimer = undefined;
    if (!game || mode !== 'local') return;
    const player = game.state.pending ? other(game.state.pending.by) : game.state.turn;
    const action = chooseAiAction(game, player, difficulty);
    if (game.dispatch(player, action)) afterAction(action);
    scheduleAi();
  }, 620);
}

function afterAction(action: GameAction): void {
  updateLegal();
  if (action.type === 'playCard') audio.card();
  else if (action.type === 'callTruco' || action.type === 'raiseTruco' || action.type === 'acceptTruco') audio.truco();
  if (game?.state.phase === 'gameEnd') {
    if (game.state.winner === human) audio.win();
    else audio.lose();
  }
  render();
}

function dispatchLocal(action: GameAction): void {
  if (!game || mode !== 'local') return;
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
  hover = null;
  screen = 'online';
  mode = 'online';
  game = null;
  room = { code: '', status: 'Conectando al servidor...', connected: false, token: localStorage.getItem('truco-token') ?? '' };
  net.onMessage = handleNetMessage;
  net.onClose = () => {
    room.status = 'Se perdio la conexion con el servidor';
    room.connected = false;
    render();
  };
  net.connect(room.token || undefined);
  render();
}

function handleNetMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'welcome': {
      human = message.player;
      room.code = message.code;
      room.token = message.token;
      room.status = message.player === 0 ? 'Esperando al rival...' : 'Conectado';
      localStorage.setItem('truco-token', message.token);
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
  net.close();
  hover = null;
  screen = 'menu';
  game = null;
  render();
}

function handleHit(id: string): void {
  audio.click();
  if (id.startsWith('diff:')) {
    difficulty = id.slice(5) as Difficulty;
    render();
    return;
  }
  if (id === 'menu:local') return startLocal();
  if (id === 'menu:online') return startOnline();
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
    const code = window.prompt('Codigo de la sala (4 letras)')?.trim().toUpperCase() ?? '';
    if (!code) return;
    room.status = `Uniendose a ${code}...`;
    if (!net.join(code)) room.status = 'Primero conectate al servidor';
    render();
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
    if (mode === 'local') dispatchLocal(action);
    else dispatchOnline(action);
    return;
  }
  if (id.startsWith('action:')) {
    const type = id.slice(7) as GameAction['type'];
    const action = legal.find((a) => a.type === type);
    if (!action) return;
    if (mode === 'local') dispatchLocal(action);
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
  const key = event.key.toLowerCase();
  if (key === 'escape' && screen !== 'menu') {
    goMenu();
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
      if (mode === 'local') dispatchLocal(action);
      else dispatchOnline(action);
    }
    return;
  }

  const shortcuts: Record<string, GameAction['type'][]> = {
    e: ['acceptEnvido', 'callEnvido'],
    r: ['callRealEnvido'],
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
    if (mode === 'local') dispatchLocal(action);
    else dispatchOnline(action);
  }
});

function loop(): void {
  render();
  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
