import { Router, Request, Response } from "express";
import InvitationToken from "../models/InvitationToken";
import Coach from "../models/Coach";
import Client from "../models/Client";
import { IUser } from "../models/User";
import Program, { IProgram } from "../models/Program";
import Session, { ISession } from "../models/Session";

const router = Router();

const requireCoach = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = (req.session as any).userId;
    const coach = await Coach.findOne({ userId });

    if (!coach) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    (req as any).coach = coach;

    next();
  } catch (error) {
    console.error("Coach check error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

router.post(
  "/generate-invitation",
  requireCoach,
  async (req: Request, res: Response) => {
    try {
      const coach = (req as any).coach;
      const expiresIn = req.body.expiresIn || 7; // jours
      const minimumDaysLeft = 5; // jours minimum de validité

      // Calculer la date minimum de validité souhaitée
      const minimumValidUntil = new Date();
      minimumValidUntil.setDate(minimumValidUntil.getDate() + minimumDaysLeft);

      // Chercher un token existant encore valide pour au moins 5 jours
      let invitationToken = await InvitationToken.findOne({
        coachId: coach._id,
        expiresAt: { $gte: minimumValidUntil },
      }).sort({ expiresAt: -1 }); // Prendre le plus récent

      if (!invitationToken) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);

        invitationToken = await InvitationToken.create({
          coachId: coach._id,
          expiresAt: expiresAt,
        });
      }

      res.json({
        message: "Lien d'invitation généré avec succès",
        token: invitationToken.token,
        expiresAt: invitationToken.expiresAt,
      });
    } catch (error) {
      console.error("Generate invitation error:", error);
      res.status(500).json({ message: "Error generating invitation link" });
    }
  }
);

router.get("/clients", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;

    const clients = await Client.find({
      "coaches.coachId": coach._id,
    }).populate("userId");

    // Formater les données pour le frontend
    const formattedClients = clients.map((client) => {
      const user = client.userId as IUser;

      return {
        _id: client._id,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      };
    });

    res.json(formattedClients);
  } catch (error) {
    console.error("Fetch clients error:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des clients" });
  }
});

router.get(
  "/clients/:id",
  requireCoach,
  async (req: Request, res: Response) => {
    try {
      const coach = (req as any).coach;
      const { id: clientId } = req.params;

      const client = await Client.findOne({
        _id: clientId,
        "coaches.coachId": coach._id,
      }).populate("userId");

      if (!client) {
        return res.status(404).json({ message: "Client non trouvé" });
      }

      const user = client.userId as IUser;

      const activeProgram: IProgram | null = await Program.findOne({
        clientId: client._id,
        coachId: coach._id,
      }).sort({ createdAt: -1 });

      let sessions: ISession[] = [];

      if (activeProgram) {
        sessions = await Session.find({
          programId: activeProgram._id,
        })
          .sort({ order: 1 })
          .populate("warmup.exercises.exerciseId")
          .populate("workout.exercises.exerciseId");
      }

      res.json({
        _id: client._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        program: activeProgram,
        sessions: sessions,
      });
    } catch (error) {
      console.error("Fetch client detail error:", error);
      res.status(500).json({
        message: "Erreur lors de la récupération des détails du client",
      });
    }
  }
);

export default router;
