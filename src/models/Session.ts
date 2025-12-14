import { model, Schema, Types, Document } from "mongoose";

interface WarmupExercise {
  exerciseId: Types.ObjectId;
  duration?: number;
  reps?: number;
}

interface WorkoutExercise {
  exerciseId: Types.ObjectId;
  sets?: number;
  reps?: number;
  weight?: number;
  restBetweenSets?: number;
  duration?: number;
  restAfter?: number;
  notes?: string;
}

export interface ISession extends Document {
  programId: Types.ObjectId;
  name: string;
  order: number;
  warmup?: {
    notes?: string;
    exercises: WarmupExercise[];
  };
  workout: {
    notes?: string;
    rounds: number;
    restBetweenRounds?: number;
    exercises: WorkoutExercise[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    warmup: {
      notes: { type: String, trim: true },
      exercises: [
        {
          exerciseId: {
            type: Schema.Types.ObjectId,
            ref: "Exercise",
            required: true,
          },
          duration: { type: Number, min: 0 },
          reps: { type: Number, min: 0 },
          notes: { type: String, trim: true },
        },
      ],
    },
    workout: {
      notes: { type: String, trim: true },
      rounds: { type: Number, required: true, min: 1 },
      restBetweenRounds: { type: Number },
      exercises: [
        {
          exerciseId: {
            type: Schema.Types.ObjectId,
            ref: "Exercise",
            required: true,
          },
          sets: { type: Number, min: 0 },
          reps: { type: Number, min: 0 },
          weight: { type: Number, min: 0 },
          restBetweenSets: { type: Number },
          duration: { type: Number },
          restAfter: { type: Number },
          notes: { type: String, trim: true },
        },
      ],
    },
  },
  { timestamps: true }
);

SessionSchema.index({ programId: 1, order: 1 });

const Session = model<ISession>("Session", SessionSchema);

export default Session;
