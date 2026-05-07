import { model, Schema, Types, Document } from "mongoose";

export interface IBlockExerciseSnapshot {
  exercise: Record<string, unknown>;
  order: number;
  sets?: number;
  restBetweenSets?: number;
  reps?: number;
  duration?: number;
  customMetric?: { value: number; unit: string };
}

export interface IBlockSnapshot {
  type: string;
  label?: string;
  order: number;
  notes?: string;
  durationMinutes?: number;
  intervalMinutes?: number;
  rounds?: number;
  restBetweenRounds?: number;
  workDuration?: number;
  restDuration?: number;
  repsScheme?: number[];
  exercises: IBlockExerciseSnapshot[];
}

export interface ICompletedSession extends Document {
  clientId: Types.ObjectId;
  programId: Types.ObjectId;
  originalSessionId: Types.ObjectId;
  sessionOrder: number;
  blocks: IBlockSnapshot[];
  coachNotes?: string;
  metrics: {
    stress: number;
    mood: number;
    energy: number;
    sleep: number;
    soreness: number;
  };
  clientNotes?: string;
  viewedByCoach: boolean;
  completedAt: Date;
}

const exerciseSnapshotSchema = new Schema(
  {
    exercise: { type: Schema.Types.Mixed, required: true },
    order: { type: Number, required: true },
    sets: { type: Number },
    restBetweenSets: { type: Number },
    reps: { type: Number },
    duration: { type: Number },
    customMetric: {
      value: { type: Number },
      unit: { type: String },
    },
  },
  { _id: false },
);

const blockSnapshotSchema = new Schema(
  {
    type: { type: String, required: true },
    label: { type: String },
    order: { type: Number, required: true },
    notes: { type: String },
    durationMinutes: { type: Number },
    intervalMinutes: { type: Number },
    rounds: { type: Number },
    restBetweenRounds: { type: Number },
    workDuration: { type: Number },
    restDuration: { type: Number },
    repsScheme: [{ type: Number }],
    exercises: [exerciseSnapshotSchema],
  },
  { _id: false },
);

const CompletedSessionSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    programId: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    originalSessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    sessionOrder: { type: Number, required: true },
    blocks: [blockSnapshotSchema],
    coachNotes: { type: String },
    metrics: {
      stress: { type: Number, required: true, min: 1, max: 5 },
      mood: { type: Number, required: true, min: 1, max: 5 },
      energy: { type: Number, required: true, min: 1, max: 5 },
      sleep: { type: Number, required: true, min: 1, max: 5 },
      soreness: { type: Number, required: true, min: 1, max: 5 },
    },
    clientNotes: { type: String },
    viewedByCoach: { type: Boolean, default: false },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

CompletedSessionSchema.index({ clientId: 1, completedAt: -1 });
CompletedSessionSchema.index({ clientId: 1, programId: 1 });

const CompletedSession = model<ICompletedSession>(
  "CompletedSession",
  CompletedSessionSchema,
);

export default CompletedSession;
