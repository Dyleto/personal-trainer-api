import { Router, Request, Response } from "express";
import InvitationToken from "../models/InvitationToken";
import Coach from "../models/Coach";
import Client from "../models/Client";
import { IUser } from "../models/User";
import Program, { IProgram } from "../models/Program";
import Session, { ISession } from "../models/Session";
import Exercise from "../models/Exercise";

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

router.post("/generate-invitation", requireCoach, async (req: Request, res: Response) => {
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
});

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
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
});

router.get("/clients/:id", requireCoach, async (req: Request, res: Response) => {
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
});

/**
 * Exercises CRUD
 */
router.get("/exercises/stats", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;

    const warmupCount = await Exercise.countDocuments({ createdBy: coach._id, type: "warmup" });
    const exerciseCount = await Exercise.countDocuments({ createdBy: coach._id, type: "exercise" });

    res.json({ warmupCount, exerciseCount });
  } catch (error) {
    console.error("Fetch exercises stats error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques des exercices" });
  }
});

router.get("/exercises", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;

    const exercises = await Exercise.find({ createdBy: coach._id }).sort({ type: 1, name: 1 });

    res.json(exercises);
  } catch (error) {
    console.error("Fetch exercises error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des exercices" });
  }
});

router.get("/exercises/:id", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;
    const { id: exerciseId } = req.params;
    const exercise = await Exercise.findOne({ _id: exerciseId, createdBy: coach._id });

    if (!exercise) {
      return res.status(404).json({ message: "Exercice non trouvé" });
    }

    res.json(exercise);
  } catch (error) {
    console.error("Fetch exercise detail error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des détails de l'exercice" });
  }
});

router.post("/exercises", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;
    const { name, description, videoUrl, type } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({ message: "Nom et type sont requis" });
    }

    if (!["warmup", "exercise"].includes(type)) {
      return res.status(400).json({ message: "Type invalide. Doit être 'warmup' ou 'exercise'" });
    }

    // Créer l'exercice
    const exercise = await Exercise.create({
      name,
      description: description || "",
      videoUrl: videoUrl || "",
      type,
      createdBy: coach._id,
    });

    res.status(201).json(exercise);
  } catch (error) {
    console.error("Create exercise error:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'exercice" });
  }
});

router.put("/exercises/:id", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;
    const { id: exerciseId } = req.params;
    const { name, description, videoUrl, type } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({ message: "Nom et type sont requis" });
    }

    if (!["warmup", "exercise"].includes(type)) {
      return res.status(400).json({ message: "Type invalide. Doit être 'warmup' ou 'exercise'" });
    }

    // Vérifier que l'exercice existe et appartient au coach
    const exercise = await Exercise.findOne({ _id: exerciseId, createdBy: coach._id });

    if (!exercise) {
      return res.status(404).json({ message: "Exercice non trouvé" });
    }

    // Mettre à jour
    exercise.name = name;
    exercise.description = description || "";
    exercise.videoUrl = videoUrl || "";
    exercise.type = type;

    await exercise.save();

    res.json(exercise);
  } catch (error) {
    console.error("Update exercise error:", error);
    res.status(500).json({ message: "Erreur lors de la modification de l'exercice" });
  }
});

router.delete("/exercises/:id", requireCoach, async (req: Request, res: Response) => {
  try {
    const coach = (req as any).coach;
    const { id: exerciseId } = req.params;

    // Vérifier que l'exercice existe et appartient au coach
    const exercise = await Exercise.findOne({ _id: exerciseId, createdBy: coach._id });

    if (!exercise) {
      return res.status(404).json({ message: "Exercice non trouvé" });
    }

    await exercise.deleteOne();

    res.json({ message: "Exercice supprimé avec succès" });
  } catch (error) {
    console.error("Delete exercise error:", error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'exercice" });
  }
});

export default router;
