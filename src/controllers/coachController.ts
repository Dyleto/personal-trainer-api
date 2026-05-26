import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { ICoach } from "../models/Coach";
import InvitationToken from "../models/InvitationToken";
import Client from "../models/Client";
import Exercise from "../models/Exercise";
import { IExercise } from "../models/Exercise";
import { IUser } from "../models/User";
import Session from "../models/Session";
import { ISessionBlock } from "../models/Session";
import mongoose, { isValidObjectId, Types } from "mongoose";
import CompletedSession from "../models/CompletedSession";
import { getAuthorizedClient } from "../services/coachService";
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

// --------------------------------------------------------------------------
// INVITATIONS
// --------------------------------------------------------------------------

export const generateInvitation = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const expiresIn = req.body.expiresIn || 7; // jours
    const minimumDaysLeft = 5;

    // Si on a déjà un token valide pour encore 5 jours, on le recycle
    const minimumValidUntil = new Date();
    minimumValidUntil.setDate(minimumValidUntil.getDate() + minimumDaysLeft);

    let invitationToken = await InvitationToken.findOne({
      coachId: coach._id,
      expiresAt: { $gte: minimumValidUntil },
    }).sort({ expiresAt: -1 });

    if (!invitationToken) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      invitationToken = await InvitationToken.create({
        coachId: coach._id,
        expiresAt,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Lien d'invitation généré avec succès",
      token: invitationToken.token,
      expiresAt: invitationToken.expiresAt,
      // (Bonus) l'URL directe c'est pratique :
      // inviteUrl: `${process.env.FRONTEND_URL}/join?token=${invitationToken.token}`
    });
  },
);

// --------------------------------------------------------------------------
// CLIENTS
// --------------------------------------------------------------------------

export const getClients = catchAsync(async (req: Request, res: Response) => {
  const coach = res.locals.coach as ICoach;

  const clients = await Client.aggregate([
    { $match: { "coaches.coachId": coach._id } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "completedsessions",
        let: { clientId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$clientId", "$$clientId"] },
              viewedByCoach: { $ne: true },
            },
          },
          { $count: "total" },
        ],
        as: "unseenData",
      },
    },
    {
      $project: {
        _id: 1,
        firstName: "$userDoc.firstName",
        lastName: "$userDoc.lastName",
        picture: "$userDoc.picture",
        unseenCount: {
          $ifNull: [{ $arrayElemAt: ["$unseenData.total", 0] }, 0],
        },
      },
    },
  ]);

  res.status(200).json(clients);
});

export const getClientDetails = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const clientId = req.params.id as string;

    const rawClient = await getAuthorizedClient(coach._id, clientId);
    const client = await rawClient.populate<{ userId: IUser }>("userId");

    const program = await getOrCreate(client._id);

    const rawSessions = await Session.find({ programId: program._id })
      .sort({ order: 1 })
      .populate("blocks.exercises.exerciseId")
      .lean();

    const sessions = (rawSessions as unknown as PopulatedSession[]).map(formatSession);

    const unseenCount = await CompletedSession.countDocuments({
      clientId: client._id,
      viewedByCoach: { $ne: true },
    });

    res.status(200).json({
      _id: client._id,
      firstName: client.userId.firstName,
      lastName: client.userId.lastName,
      email: client.userId.email,
      picture: client.userId.picture,
      program: {
        ...program.toObject(),
        sessions,
      },
      unseenCount,
    });
  },
);

export const getClientHistory = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const clientId = req.params.id as string;

    const client = await getAuthorizedClient(coach._id, clientId);

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);

    const history = await CompletedSession.find({ clientId: client._id })
      .sort({ completedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json(history);
  },
);

export const markHistoryAsViewed = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const clientId = req.params.id as string;

    const client = await getAuthorizedClient(coach._id, clientId);

    await CompletedSession.updateMany(
      { clientId, viewedByCoach: { $ne: true } },
      { $set: { viewedByCoach: true } },
    );

    res.status(200).json({ status: "success" });
  },
);

// --------------------------------------------------------------------------
// EXERCISES
// --------------------------------------------------------------------------

export const getExercisesStats = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;

    const count = await Exercise.countDocuments({ createdBy: coach._id });

    res.status(200).json({ count });
  },
);

export const getExercises = catchAsync(async (req: Request, res: Response) => {
  const coach = res.locals.coach as ICoach;

  const exercises = await Exercise.find({ createdBy: coach._id }).sort({ name: 1 });

  res.status(200).json(exercises);
});

export const getExerciseDetails = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const { id } = req.params;

    const exercise = await Exercise.findOne({ _id: id, createdBy: coach._id });
    if (!exercise) throw new AppError("Exercice non trouvé", 404);

    res.status(200).json(exercise);
  },
);

export const createExercise = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const { name, description, videoUrl } = req.body;

    const exercise = await Exercise.create({
      name,
      description: description || "",
      videoUrl: videoUrl || "",
      createdBy: coach._id,
    });

    res.status(201).json(exercise);
  },
);

export const updateExercise = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const { id } = req.params;
    const { name, description, videoUrl } = req.body;

    const exercise = await Exercise.findOne({ _id: id, createdBy: coach._id });
    if (!exercise) throw new AppError("Exercice non trouvé", 404);

    if (name) exercise.name = name;
    if (description !== undefined) exercise.description = description;
    if (videoUrl !== undefined) exercise.videoUrl = videoUrl;

    await exercise.save();

    res.status(200).json(exercise);
  },
);

export const deleteExercise = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const { id } = req.params;

    const usedInSession = await Session.findOne({
      "blocks.exercises.exerciseId": id,
    });

    if (usedInSession) {
      throw new AppError(
        "Cet exercice est utilisé dans une séance, impossible de le supprimer",
        400,
      );
    }

    const result = await Exercise.deleteOne({ _id: id, createdBy: coach._id });

    if (result.deletedCount === 0)
      throw new AppError("Exercice non trouvé", 404);

    res.status(204).send(); // 204 No Content
  },
);

// --------------------------------------------------------------------------
// PROGRAMS & SESSIONS
// --------------------------------------------------------------------------

export const updateProgramSessions = catchAsync(
  async (req: Request, res: Response) => {
    const coach = res.locals.coach as ICoach;
    const clientId = req.params.clientId as string;
    const { sessions } = req.body;

    const client = await getAuthorizedClient(coach._id, clientId);
    const program = await getOrCreate(client._id);

    type SessionInput = {
      _id?: string;
      notes?: string;
      blocks?: unknown;
    };

    const dbSession = await mongoose.startSession();
    let updatedSessions;

    try {
      await dbSession.withTransaction(async () => {
        const existingSessionIds = await Session.find({
          programId: program._id,
        })
          .select("_id")
          .session(dbSession);

        const existingIds = existingSessionIds.map((s) =>
          (s._id as Types.ObjectId).toString(),
        );

        const incomingIds = (sessions as SessionInput[])
          .filter((s) => s._id)
          .map((s) => s._id as string);

        const idsToDelete = existingIds.filter(
          (id) => !incomingIds.includes(id),
        );

        if (idsToDelete.length > 0) {
          await Session.deleteMany(
            { _id: { $in: idsToDelete }, programId: program._id },
            { session: dbSession },
          );
        }

        const operations = (sessions as SessionInput[]).map(
          (sessionData, index) => {
            const payload = {
              notes: sessionData.notes,
              blocks: sessionData.blocks,
              programId: program._id,
              order: index + 1,
            };

            if (
              sessionData._id &&
              isValidObjectId(sessionData._id) &&
              existingIds.includes(sessionData._id)
            ) {
              return Session.findByIdAndUpdate(sessionData._id, payload, {
                new: true,
                session: dbSession,
              });
            } else {
              return Session.create([payload], { session: dbSession });
            }
          },
        );

        await Promise.all(operations);

        updatedSessions = await Session.find({ programId: program._id })
          .sort({ order: 1 })
          .populate("blocks.exercises.exerciseId")
          .lean()
          .session(dbSession);
      });
    } finally {
      dbSession.endSession();
    }

    const formatted = (updatedSessions as unknown as PopulatedSession[]).map(formatSession);
    res.status(200).json(formatted);
  },
);
