import { z } from "zod";
import { BLOCK_TYPES } from "../models/Session";

const blockExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  order: z.number().int().min(1),
  sets: z.number().int().min(1).optional(),
  restBetweenSets: z.number().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  duration: z.number().min(0).optional(),
  customMetric: z
    .object({
      value: z.number(),
      unit: z.string().min(1).max(20),
    })
    .optional(),
});

const sessionBlockSchema = z.object({
  _id: z.string().optional(),
  type: z.enum(BLOCK_TYPES as [string, ...string[]]),
  label: z.string().max(100).optional(),
  order: z.number().int().min(1),
  notes: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(1).max(180).optional(),
  intervalMinutes: z.number().int().min(1).max(60).optional(),
  rounds: z.number().int().min(1).max(100).optional(),
  restBetweenRounds: z.number().min(0).max(600).optional(),
  workDuration: z.number().int().min(1).max(3600).optional(),
  restDuration: z.number().int().min(0).max(3600).optional(),
  repsScheme: z.array(z.number().int().min(1)).max(30).optional(),
  exercises: z.array(blockExerciseSchema).max(30),
});

const sessionInputSchema = z.object({
  _id: z.string().optional(),
  order: z.number().int().min(1),
  notes: z.string().max(1000).optional(),
  blocks: z.array(sessionBlockSchema).max(20),
});

export const updateProgramSessionsSchema = z.object({
  body: z.object({
    sessions: z.array(sessionInputSchema).max(30),
  }),
});
