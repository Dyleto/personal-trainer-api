import { Router, Request, Response } from "express";
import User, { IUser } from "../models/User";
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
        .json({ message: "Le code d'autorisation est requis" });
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
    if (!payload) throw new Error("Payload du token Google invalide");

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
        return res.status(400).json({ message: "Token invalide ou expiré" });
      }

      if (new Date() > invToken.expiresAt) {
        return res.status(400).json({ message: "Token expiré" });
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

      // Lier le coach au client
      const alreadyLinked = client.coaches?.some(
        (coach) => coach.coachId.toString() === invToken.coachId.toString()
      );

      if (!alreadyLinked) {
        client.coaches.push({
          coachId: invToken.coachId,
          linkedAt: new Date(),
        });
      }

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

      // Créer la session
      (req.session as any).userId = user._id;

      console.log("Cas 1 Session before save:", req.session);
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully:", req.session);
            resolve();
          }
        });
      });

      const builtUser = await buildUser(user);

      return res.json({
        user: builtUser,
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

    console.log("Cas 2 Session before save:", req.session);
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          reject(err);
        } else {
          console.log("Session saved successfully:", req.session);
          resolve();
        }
      });
    });

    const builtUser = await buildUser(user);

    res.json({
      user: builtUser,
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(401).json({ message: "Échec de l'authentification" });
  }
});

router.get("/verify-invite-token", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    const invitationToken = await InvitationToken.findOne({ token });

    if (!invitationToken) {
      return res.status(404).json({ message: "Token invalide" });
    }

    if (new Date() > invitationToken.expiresAt) {
      return res.status(410).json({ message: "Token expiré" });
    }

    const coach = await Coach.findById(invitationToken.coachId).populate(
      "userId",
      "firstName lastName, picture"
    );

    if (!coach?.userId || typeof coach.userId === "string") {
      return res.status(500).json({ message: "Infos du Coach non trouvé" });
    }

    res.json({
      valid: true,
      coach: {
        id: coach?._id,
        firstName: (coach?.userId as IUser).firstName,
        lastName: (coach?.userId as IUser).lastName,
        picture: (coach?.userId as IUser).picture,
      },
    });
  } catch (error) {
    console.error("Verify invite token error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const builtUser = await buildUser(user);

    res.json({
      user: builtUser,
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Déconnexion réussie" });
  });
});

async function buildUser(user: IUser) {
  // Vérifier les rôles
  const isCoach = await Coach.findOne({ userId: user._id });
  const isClient = await Client.findOne({ userId: user._id });

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    picture: user.picture,
    isAdmin: user.isAdmin,
    isCoach: !!isCoach,
    isClient: !!isClient,
  };
}

export default router;
