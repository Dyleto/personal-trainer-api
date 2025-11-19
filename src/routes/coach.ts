import { Router, Request, Response, NextFunction } from "express";
import InvitationToken from "../models/InvitationToken";
import Coach from "../models/Coach";

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

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      const invitationToken = await InvitationToken.create({
        coachId: coach._id,
        expiresAt: expiresAt,
      });

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

export default router;
