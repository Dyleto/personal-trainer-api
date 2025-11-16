import { Router, Request, Response } from "express";
import User from "../models/User";
import Coach from "../models/Coach";

const router = Router();

const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = (req.session as any).userId;
    const user = await User.findById(userId);

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

router.post(
  "/create-coach",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName } = req.body;

      if (!email || !firstName || !lastName) {
        return res
          .status(400)
          .json({ message: "Le prénom, le nom et l'email sont requis" });
      }

      // Vérifier que l'utilisateur n'existe pas
      let user = await User.findOne({ email });
      if (!user) {
        // Créer l'utilisateur
        user = await User.create({ email, firstName, lastName });
      }

      let coach = await Coach.findOne({ userId: user._id });
      if (coach) {
        return res
          .status(400)
          .json({ message: "Cet utilisateur est déjà un Coach" });
      }

      coach = await Coach.create({ userId: user._id, clients: [] });

      res.json({
        message: "Coach créé avec succès",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        coachId: coach._id,
      });
    } catch (error) {
      console.error("Create coach error:", error);
      res.status(500).json({ message: "Erreur lors de la création du coach" });
    }
  }
);

export default router;
