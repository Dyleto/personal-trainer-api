import { OAuth2Client } from "google-auth-library";
import User from "../models/User";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (idToken: string) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid Google token payload");

    const { email, name, sub } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: name || email,
      });
    }

    return user;
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error("Invalid Google token");
  }
};
