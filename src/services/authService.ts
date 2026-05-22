import axios from "axios";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Types } from "mongoose";
import User, { IUser } from "../models/User";
import Client from "../models/Client";
import InvitationToken from "../models/InvitationToken";
import { AppError } from "../utils/AppError";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleCredential = async (
  credential: string,
): Promise<TokenPayload> => {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email)
    throw new AppError("Token Google One Tap invalide", 401);
  return payload;
};

export const exchangeGoogleCode = async (
  code: string,
  redirectUri: string,
): Promise<TokenPayload> => {
  const tokenResponse = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    },
  );

  const ticket = await googleClient.verifyIdToken({
    idToken: tokenResponse.data.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email)
    throw new AppError("Token Google invalide", 401);

  return payload;
};

export const findOrCreateUser = async (
  payload: TokenPayload,
): Promise<IUser> => {
  const { email, name, given_name, family_name, picture } = payload;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      firstName: given_name || name?.split(" ")[0] || "",
      lastName: family_name || name?.split(" ")[1] || "",
      picture,
    });
  } else if (picture && picture !== user.picture) {
    user.picture = picture;
    await user.save();
  }
  return user;
};

export const linkClientToCoach = async (
  userId: Types.ObjectId,
  coachId: Types.ObjectId,
): Promise<void> => {
  // Crée le client s'il n'existe pas (upsert atomique)
  await Client.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, coaches: [] } },
    { upsert: true },
  );

  // Ajoute le coach seulement s'il n'est pas déjà lié (atomique, idempotent)
  await Client.updateOne(
    { userId, "coaches.coachId": { $ne: coachId } },
    { $push: { coaches: { coachId, linkedAt: new Date() } } },
  );
};

export const validateInvitationToken = async (token: string) => {
  const invToken = await InvitationToken.findOne({ token });
  if (!invToken) throw new AppError("Token d'invitation invalide", 400);
  if (new Date() > invToken.expiresAt)
    throw new AppError("Token d'invitation expiré", 400);
  return invToken;
};
