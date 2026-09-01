import { IPerformed } from '../models/CompletedSession';

// Une valeur envoyée par le client pour un exercice donné.
// `null` = efface cette valeur, clé absente = n'y touche pas.
export type PerformedInput = {
  blockOrder: number;
  exerciseOrder: number;
  weight?: number | null;
  reps?: number | null;
  sets?: number | null;
  duration?: number | null;
};

type PerformedField = keyof IPerformed;

const PERFORMED_FIELDS: PerformedField[] = [
  'weight',
  'reps',
  'sets',
  'duration',
];

type ExerciseLike = { order: number; performed?: IPerformed };
type BlockLike = { order: number; exercises: ExerciseLike[] };

// Le bloc rendu, dont les exercices portent maintenant `performed`.
type WithPerformed<B extends BlockLike> = Omit<B, 'exercises'> & {
  exercises: (B['exercises'][number] & { performed?: IPerformed })[];
};

const keyOf = (blockOrder: number, exerciseOrder: number) =>
  `${blockOrder}:${exerciseOrder}`;

const mergePerformed = (
  current: IPerformed | undefined,
  entry: PerformedInput
): IPerformed | undefined => {
  const next: IPerformed = { ...(current ?? {}) };

  PERFORMED_FIELDS.forEach((field) => {
    const value = entry[field];
    if (value === undefined) return; // non fourni : on ne touche pas
    if (value === null)
      delete next[field]; // effacé explicitement
    else next[field] = value;
  });

  // Aucune valeur renseignée : on laisse la clé absente plutôt qu'un objet
  // vide. « Pas renseigné » ne doit jamais ressembler à « zéro ».
  return Object.keys(next).length > 0 ? next : undefined;
};

/**
 * Recopie les valeurs réellement réalisées dans le snapshot de séance.
 * Ne touche QUE `exercises[].performed` : la prescription (sets/reps/duration
 * du coach) reste celle calculée par le serveur, le client ne peut pas la
 * réécrire.
 */
export const applyPerformed = <B extends BlockLike>(
  blocks: B[],
  entries?: PerformedInput[]
): WithPerformed<B>[] => {
  if (!entries || entries.length === 0) return blocks as WithPerformed<B>[];

  const byKey = new Map<string, PerformedInput>();
  entries.forEach((entry) => {
    byKey.set(keyOf(entry.blockOrder, entry.exerciseOrder), entry);
  });

  return blocks.map((block) => ({
    ...block,
    exercises: block.exercises.map((exercise) => {
      const entry = byKey.get(keyOf(block.order, exercise.order));
      if (!entry) return exercise;
      return {
        ...exercise,
        performed: mergePerformed(exercise.performed, entry),
      };
    }),
  }));
};
