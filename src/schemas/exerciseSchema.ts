import { z } from "zod";

const exerciseType = z.enum(["warmup", "workout"], {
  message: "Le type doit être 'warmup' ou 'workout'",
});

export const createExerciseSchema = z.object({
  body: z.object({
    name: z.string({ message: "Le nom est requis" }).min(1, "Le nom est requis"),
    type: exerciseType,
    description: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
});

export const updateExerciseSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Le nom est requis").optional(),
    type: exerciseType.optional(),
    description: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
});
