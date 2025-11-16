import { Router, Request, Response } from "express";
import User from "../models/User";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import Client from "../models/Client";
import InvitationToken from "../models/InvitationToken";
import Coach from "../models/Coach";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google-callback", async (req: Request, res: Response) => {
  try {
    const { code, redirectUri, invitationToken } = req.body;

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

    const { id_token } = tokenResponse.data;

    // Vérifier l'id_token
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid Google token payload");

    const { email, name, given_name, family_name, picture } = payload!;

    // ============================================
    // CAS 1 : Connexion avec token d'invitation
    // ============================================
    if (invitationToken) {
      // Valider le token
      const invToken = await InvitationToken.findOne({
        token: invitationToken,
      });

      if (!invToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      if (new Date() > invToken.expiresAt) {
        return res.status(400).json({ message: "Token has expired" });
      }

      // Chercher ou créer l'utilisateur
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          firstName: given_name || name?.split(" ")[0] || "",
          lastName: family_name || name?.split(" ")[1] || "",
          picture,
        });
      } else {
        // Mettre à jour la photo de profil si nécessaire
        if (picture && picture !== user.picture) {
          user.picture = picture;
          await user.save();
        }
      }

      // Chercher ou créer le client
      let client = await Client.findOne({ userId: user._id });
      if (!client) {
        client = await Client.create({ userId: user._id });
      }

      // Vérifier que le client n'a pas déjà un coach
      if (client.coachId) {
        return res.status(400).json({
          message: "You already have a coach. Please unbind first to change.",
        });
      }

      // Lier le coach au client
      client.coachId = invToken.coachId;
      client.linkedAt = new Date();
      await client.save();

      // Ajouter le client à la liste du coach
      const coach = await Coach.findById(invToken.coachId);

      if (coach) {
        await Coach.findByIdAndUpdate(
          coach._id,
          { $addToSet: { clients: user._id } },
          { new: true }
        );
      }

      // Marquer le token comme utilisé
      invToken.usedAt = new Date();
      await invToken.save();

      // Créer la session
      (req.session as any).userId = user._id;

      return res.json({
        token: id_token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          picture: user.picture,
          isAdmin: user.isAdmin,
        },
      });
    }

    // ============================================
    // CAS 2 : Connexion classique (sans token)
    // ============================================
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "User not found. Please contact your coach to be added.",
      });
    }

    // Mettre à jour la photo de profil si nécessaire
    if (picture && picture !== user.picture) {
      user.picture = picture;
      await user.save();
    }

    // Créer la session
    (req.session as any).userId = user._id;

    res.json({
      token: id_token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
});

router.post("/join", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = (req.session as any).userId;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Valider le token
    const invitationToken = await InvitationToken.findOne({ token });

    if (!invitationToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (new Date() > invitationToken.expiresAt) {
      return res.status(400).json({ message: "Token has expired" });
    }

    if (userId) {
      // Utilisateur déjà connecté
      const existingClient = await Client.findOne({ userId });
    }

    // Récupérer le client
    let client = await Client.findOne({ userId });
    if (!client) {
      client = await Client.create({ userId });
    }

    // Vérifier que le client n'a pas déjà un coach
    if (client.coachId) {
      return res.status(400).json({
        message: "You already have a coach. Please unbind first to change.",
      });
    }

    // Lier le coach au client
    client.coachId = invitationToken.coachId;
    client.linkedAt = new Date();
    await client.save();

    // Ajouter le client à la liste du coach
    const coach = await Coach.findById(invitationToken.coachId);
    if (coach && !coach.clients.includes(userId)) {
      coach.clients.push(userId);
      await coach.save();
    }

    res.json({ message: "Successfully joined coach" });
  } catch (error) {
    console.error("Join coach error:", error);
    res.status(500).json({ message: "Error joining coach" });
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
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
