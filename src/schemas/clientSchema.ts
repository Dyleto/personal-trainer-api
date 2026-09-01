import { z } from 'zod';
import { FEEDBACK_TAGS } from '../constants/feedback';

// Legacy : ancien bilan en 5 axes. Encore accepté le temps que le front
// bascule sur `feedback`, jamais exigé.
const metricsSchema = z.object({
  stress: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
});

const feedbackSchema = z.object({
  effort: z.number().int().min(1).max(5),
  tags: z.array(z.enum(FEEDBACK_TAGS)).max(FEEDBACK_TAGS.length).optional(),
  note: z.string().trim().max(2000).optional(),
});

// Une valeur réellement faite. `null` veut dire « efface cette valeur »,
// `undefined` (clé absente) veut dire « n'y touche pas ».
const performedValue = z.number().min(0).max(10000).nullable().optional();

const performedEntrySchema = z.object({
  blockOrder: z.number().int().min(0),
  exerciseOrder: z.number().int().min(0),
  weight: performedValue,
  reps: performedValue,
  sets: performedValue,
  duration: performedValue,
});

const performedSchema = z.array(performedEntrySchema).max(500);

const pastDate = z.coerce.date().refine((date) => date <= new Date(), {
  message: 'La date de complétion ne peut pas être dans le futur',
});

export const completeSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1),
  }),
  body: z
    .object({
      feedback: feedbackSchema.optional(),
      metrics: metricsSchema.optional(),
      performed: performedSchema.optional(),
      clientNotes: z.string().max(5000).optional(),
      completedAt: pastDate.optional(),
    })
    .refine(
      (body) => body.feedback !== undefined || body.metrics !== undefined,
      {
        message: 'Le ressenti de fin de séance est obligatoire',
        path: ['feedback'],
      }
    ),
});

export const updateCompletedSessionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      feedback: feedbackSchema.optional(),
      performed: performedSchema.optional(),
      clientNotes: z.string().max(5000).optional(),
      completedAt: pastDate.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Aucune modification fournie',
    }),
});
