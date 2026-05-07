import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { IClient } from "../models/Client";
import { IExercise } from "../models/Exercise";
import { ISessionBlock } from "../models/Session";
import Program from "../models/Program";
import Session from "../models/Session";
import CompletedSession from "../models/CompletedSession";
import { getOrCreate } from "../services/programService";

type PopulatedBlockExercise = {
  exerciseId: IExercise;
  order: number;
  sets?: number;
  restBetweenSets?: number;
  reps?: number;
  duration?: number;
  customMetric?: { value: number; unit: string };
};

type PopulatedBlock = Omit<ISessionBlock, "exercises"> & {
  exercises: PopulatedBlockExercise[];
};

type PopulatedSession = {
  _id: unknown;
  order: number;
  notes?: string;
  blocks: PopulatedBlock[];
  createdAt: Date;
  updatedAt: Date;
};

const formatSession = (session: PopulatedSession) => ({
  ...session,
  blocks: session.blocks.map((block) => ({
    ...block,
    exercises: block.exercises.map(({ exerciseId, ...rest }) => ({
      ...rest,
      exercise: exerciseId,
    })),
  })),
});

// GET /api/client/program
export const getProgram = catchAsync(async (req: Request, res: Response) => {
  const client = res.locals.client as IClient;

  const program = await getOrCreate(client._id);

  const sessions = await Session.find({ programId: program._id })
    .sort({ order: 1 })
    .populate("blocks.exercises.exerciseId")
    .lean();

  res.status(200).json({
    program: {
      ...program.toObject(),
      sessions: (sessions as unknown as PopulatedSession[]).map(formatSession),
    },
  });
});

// POST /api/client/sessions/:sessionId/complete
export const completeSession = catchAsync(
  async (req: Request, res: Response) => {
    const client = res.locals.client as IClient;
    const { sessionId } = req.params;
    const { metrics, clientNotes } = req.body;

    const program = await Program.findOne({ clientId: client._id });
    if (!program) throw new AppError("Programme introuvable", 404);

    const session = await Session.findOne({
      _id: sessionId,
      programId: program._id,
    })
      .populate("blocks.exercises.exerciseId")
      .lean();

    if (!session) throw new AppError("Séance introuvable", 404);

    const formatted = formatSession(session as unknown as PopulatedSession);

    const completed = await CompletedSession.create({
      clientId: client._id,
      programId: program._id,
      originalSessionId: session._id,
      sessionOrder: session.order,
      blocks: formatted.blocks,
      coachNotes: session.notes,
      metrics,
      clientNotes,
    });

    res.status(201).json({ completed });
  },
);

// GET /api/client/history
export const getHistory = catchAsync(async (req: Request, res: Response) => {
  const client = res.locals.client as IClient;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);

  const history = await CompletedSession.find({ clientId: client._id })
    .sort({ completedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({ history });
});
