import type { AiProfile, Difficulty } from './ai';

export interface StoryOpponent {
  id: string;
  name: string;
  title: string;
  difficulty: Difficulty;
  /** Color de la camisa del rival en la mesa. */
  color: string;
  intro: string;
  win: string;
  lose: string;
  /** Frases sueltas al cantar truco o envido durante la partida. */
  taunts: { truco: string[]; envido: string[] };
  /** Ajustes de personalidad sobre la dificultad base. */
  profile?: Partial<AiProfile>;
}

/**
 * Campaña de un jugador: cinco duelos antes del campeón final.
 * Cada rival usa la IA con una dificultad distinta.
 */
export const STORY_OPPONENTS: StoryOpponent[] = [
  {
    id: 'carlos',
    name: 'CARLOS',
    title: 'EL QUE SIEMPRE CANTA PRIMERO',
    difficulty: 'facil',
    color: '#c84348',
    intro: '¿Vos jugás truco? Yo lo inventé. Sentate, nene.',
    win: 'Carlos se rinde el mate. "Tuviste suerte... esta vez."',
    lose: 'Carlos se ríe: "Aprendé a cantar, principiante."',
    taunts: {
      truco: ['¡Truco! ¿Y ahora?', 'Canto primero, siempre.', '¿Querés o no querés?'],
      envido: ['Tengo envido, mirá.', 'Sumo dos y listo.', '¿Te asusta el envido?'],
    },
    profile: { bluff: 0.8, envidoBias: -0.2, foldTolerance: 0.9, noise: 1.2, label: 'Carlos' },
  },
  {
    id: 'nena',
    name: 'LA NENA',
    title: 'LA QUE NUNCA TE CREE EL ENVIDIO',
    difficulty: 'facil',
    color: '#d16b9c',
    intro: 'No te ilusiones, lindo. Yo también sé cantar.',
    win: 'La Nena te guiña un ojo. "Estás empezando a entender."',
    lose: 'La Nena sonríe: "Te comiste el envido, lindo."',
    taunts: {
      truco: ['¿Truco? A ver si aguantás.', 'No te lo creo, lindo.', 'Subo y vos callás.'],
      envido: ['Mi envido no se discute.', 'Conté mejor que vos.', 'Real envido, ¿te animás?'],
    },
    profile: { bluff: 0.3, envidoBias: 0.75, foldTolerance: 0.7, samples: 6, label: 'La Nena' },
  },
  {
    id: 'pepe',
    name: 'TÍO PEPE',
    title: 'EL DE LOS TANTOS Y EL MATE',
    difficulty: 'medio',
    color: '#b8862b',
    intro: 'Traje el mate y los tantos. Vamos a ver si aguantás el retruco.',
    win: 'Tío Pepe te alcanza el mate. "Bien ahí, sobrino."',
    lose: 'Tío Pepe dice: "Los tantos los gana quien no duda."',
    taunts: {
      truco: ['Retruco, sobrino.', 'El mate espera, yo no.', 'Vale cuatro y se acabó.'],
      envido: ['Los tantos son míos.', 'Canto real, tomá mate.', 'Tengo 33, no me mientas.'],
    },
    profile: { bluff: 0.12, envidoBias: 0.35, foldTolerance: 0.45, samples: 18, label: 'Tío Pepe' },
  },
  {
    id: 'bruja',
    name: 'LA BRUJA',
    title: 'LA DEL ENVIDO IMPOSIBLE',
    difficulty: 'medio',
    color: '#7b4ea8',
    intro: 'Tengo 33 escondidos. ¿Te animás a cantar falta?',
    win: 'La Bruja guarda sus cartas. "Me ganaste... con truco."',
    lose: 'La Bruja susurra: "No debiste aceptar mi falta."',
    taunts: {
      truco: ['El truco también es magia.', 'No te podés escapar.', 'Te gano aunque quieras.'],
      envido: ['Falta envido, adiviná.', 'Tengo 33 escondidos.', 'Envido envido, ¿seguís?'],
    },
    profile: { bluff: 0.35, envidoBias: 0.95, foldTolerance: 0.3, samples: 20, label: 'La Bruja' },
  },
  {
    id: 'campeon',
    name: 'EL CAMPEÓN',
    title: 'EL QUE NUNCA PIERDE EN CASA',
    difficulty: 'dificil',
    color: '#8f2a32',
    intro: 'Acá se decide quién manda. Sentate derecho y jugá.',
    win: 'El Campeón se levanta. "El truco es tuyo, campeón."',
    lose: 'El Campeón dice: "Volvé cuando sepas ir al mazo."',
    taunts: {
      truco: ['Acá no se regala nada.', 'Truco. Demostrá.', 'Seguí, que viene retruco.'],
      envido: ['Falta. Ahora sí duele.', 'Tu envido no me llega.', 'Canto y no me arrepiento.'],
    },
    profile: { bluff: 0.02, envidoBias: 0.2, foldTolerance: 0.08, samples: 40, noise: 0, label: 'El Campeón' },
  },
];

const PROGRESS_KEY = 'truco-historia-progreso';

export function isStoryUnlocked(progress: number, index: number): boolean {
  return index <= progress && index < STORY_OPPONENTS.length;
}

/** Devuelve el máximo capítulo desbloqueado (0 = el primero). */
export function loadStoryProgress(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const value = raw === null ? 0 : Number(raw);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(STORY_OPPONENTS.length, Math.floor(value)));
  } catch {
    return 0;
  }
}

export function saveStoryProgress(progress: number): void {
  try {
    localStorage.setItem(PROGRESS_KEY, String(progress));
  } catch {
    // Almacenamiento no disponible: la campaña sigue funcionando en memoria.
  }
}

/** Desbloquea el capítulo siguiente al ganar. */
export function markStoryWin(progress: number, index: number): number {
  return Math.min(STORY_OPPONENTS.length, Math.max(progress, index + 1));
}
