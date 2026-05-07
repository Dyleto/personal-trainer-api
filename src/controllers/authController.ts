import { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/User";
import Coach from "../models/Coach";
import { IUser } from "../models/User";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { buildUser } from "../services/userService";
import {
  exchangeGoogleCode,
  findOrCreateUser,
  linkClientToCoach,
  validateInvitationToken,
} from "../services/authService";

export const googleAuthCallback = catchAsync(
  async (req: Request, res: Response) => {
    const { code, redirectUri, invitationToken } = req.body;

    const payload = await exchangeGoogleCode(code, redirectUri);

    if (invitationToken) {
      const invToken = await validateInvitationToken(invitationToken);
      const user = await findOrCreateUser(payload);
      await linkClientToCoach(
        user._id as Types.ObjectId,
        invToken.coachId as Types.ObjectId,
      );
    }

    const user = await User.findOne({ email: payload.email });
    if (!user)
      throw new AppError("Utilisateur inconnu. Contactez votre coach.", 401);

    if (payload.picture && payload.picture !== user.picture) {
      user.picture = payload.picture;
      await user.save();
    }

    req.session.userId = (user._id as string).toString();
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const builtUser = await buildUser(user);
    res.status(200).json({ status: "success", user: builtUser });
  },
);

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) throw new AppError("Non authentifié", 401);

  const user = await User.findById(userId);
  if (!user) throw new AppError("Utilisateur introuvable", 404);

  const builtUser = await buildUser(user);
  res.status(200).json({ status: "success", user: builtUser });
});

export const verifyInviteToken = catchAsync(
  async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) throw new AppError("Token manquant", 400);

    const invitationToken = await validateInvitationToken(token);

    const coach = await Coach.findById(invitationToken.coachId).populate<{
      userId: IUser;
    }>("userId", "firstName lastName picture");

    if (!coach || !coach.userId) throw new AppError("Coach introuvable", 500);

    res.status(200).json({
      valid: true,
      coach: {
        id: coach._id,
        firstName: coach.userId.firstName,
        lastName: coach.userId.lastName,
        picture: coach.userId.picture,
      },
    });
  },
);

export const logout = catchAsync(async (req: Request, res: Response) => {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
  res.clearCookie("connect.sid");
  res.status(200).json({ message: "Déconnexion réussie" });
});
