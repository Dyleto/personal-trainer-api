import { Router, Request, Response } from "express";
import { verifyGoogleToken } from "../services/googleAuth";
import User from "../models/User";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    const user = await verifyGoogleToken(idToken);

    (req.session as any).userId = user._id;

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
});

router.post("/google-callback", async (req: Request, res: Response) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    //Échanger le code contre un token auprès de Google
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }
    );

    const { id_token, access_token } = tokenResponse.data;

    // Vérifier l'id_token
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload!;

    // Créer ou mettre à jour l'utilisateur
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        picture,
      });
    } else {
      user.picture = picture;
      await user.save();
    }

    // Créer la session
    (req.session as any).userId = user._id;
    res.json({
      token: id_token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
