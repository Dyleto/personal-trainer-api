import { Request, Response } from "express";
import User from "../models/User";
import Coach from "../models/Coach";
import Client from "../models/Client";
import Exercise from "../models/Exercise";
import CompletedSession from "../models/CompletedSession";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export const createCoach = catchAsync(async (req: Request, res: Response) => {
  const { email, firstName, lastName } = req.body;

  let user = await User.findOne({ email });

  if (user) {
    const existingCoach = await Coach.findOne({ userId: user._id });
    if (existingCoach) {
      throw new AppError("Cet utilisateur est déjà coach", 409);
    }
  } else {
    user = await User.create({ email, firstName, lastName });
  }

  const coach = await Coach.create({ userId: user._id });

  res.status(201).json({
    status: "success",
    message: "Coach créé avec succès",
    coach,
    user,
  });
});

export const getStats = catchAsync(async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [coachCount, clientCount, sessionCount, sessionTodayCount, exerciseCount] =
    await Promise.all([
      Coach.countDocuments(),
      Client.countDocuments(),
      CompletedSession.countDocuments(),
      CompletedSession.countDocuments({ completedAt: { $gte: todayStart } }),
      Exercise.countDocuments(),
    ]);

  res.status(200).json({
    coachCount,
    clientCount,
    sessionCount,
    sessionTodayCount,
    exerciseCount,
  });
});

export const getCoaches = catchAsync(async (_req: Request, res: Response) => {
  const coaches = await Coach.aggregate([
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
        from: "clients",
        let: { coachId: "$_id" },
        pipeline: [
          { $match: { $expr: { $in: ["$$coachId", "$coaches.coachId"] } } },
          { $count: "total" },
        ],
        as: "clientData",
      },
    },
    {
      $lookup: {
        from: "exercises",
        let: { coachId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$createdBy", "$$coachId"] } } },
          { $count: "total" },
        ],
        as: "exerciseData",
      },
    },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        firstName: "$userDoc.firstName",
        lastName: "$userDoc.lastName",
        email: "$userDoc.email",
        picture: "$userDoc.picture",
        clientCount: { $ifNull: [{ $arrayElemAt: ["$clientData.total", 0] }, 0] },
        exerciseCount: { $ifNull: [{ $arrayElemAt: ["$exerciseData.total", 0] }, 0] },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).json(coaches);
});
