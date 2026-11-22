import type { GameAction, GameState, PlayerIndex } from '../core/types';

export type ServerMessage =
  | { type: 'welcome'; player: PlayerIndex; token: string; code: string; state: GameState | null }
  | { type: 'state'; state: GameState }
  | { type: 'opponent'; connected: boolean }
  | { type: 'error'; message: string };

export type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'action'; action: GameAction };

export class NetClient {
  private ws: WebSocket | null = null;
  private queued: ClientMessage[] = [];
  onMessage?: (message: ServerMessage) => void;
  onClose?: () => void;

  connect(token?: string): void {
    this.detach();
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    let closeNotified = false;
    const notifyClose = (): void => {
      if (closeNotified) return;
      closeNotified = true;
      this.onClose?.();
    };
    ws.onopen = () => this.flush();
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        this.onMessage?.(message);
      } catch {
        // Ignora mensajes mal formados.
      }
    };
    ws.onclose = notifyClose;
    ws.onerror = notifyClose;
  }

  /** Desactiva los handlers del socket viejo para que un cierre tardío no dispare reconexiones. */
  private detach(): void {
    if (!this.ws) return;
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.ws = null;
  }

  private flush(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    for (const message of this.queued) this.ws.send(JSON.stringify(message));
    this.queued = [];
  }

  private send(message: ClientMessage): boolean {
    if (!this.ws) return false;
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.queued.push(message);
      return true;
    }
    if (this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  create(): boolean {
    return this.send({ type: 'create' });
  }

  join(code: string): boolean {
    return this.send({ type: 'join', code });
  }

  action(action: GameAction): boolean {
    return this.send({ type: 'action', action });
  }

  close(): void {
    this.queued = [];
    this.detach();
  }
}
