import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/Exercise';

dotenv.config();

const exercises = [
  // --- ECHAUFFEMENTS (WARMUP) ---
  {
    name: 'Jumping Jacks',
    description: 'Sauts écarts pour monter le cardio et activer tout le corps.',
    videoUrl: 'https://www.youtube.com/watch?v=UpH7rm0cYbM',
  },
  {
    name: 'Rotations des épaules',
    description:
      "Cercles avec les bras pour mobiliser l'articulation de l'épaule.",
  },
  {
    name: 'Cat-Cow',
    description: 'Mobilisation de la colonne vertébrale à quatre pattes.',
  },
  {
    name: 'Squat PDC (Poids du corps)',
    description: 'Squat sans charge pour activer les jambes et les hanches.',
  },
  {
    name: 'Fentes avant dynamiques',
    description:
      'Pas en avant alternés pour étirer les fléchisseurs et activer les cuisses.',
  },
  {
    name: 'High Knees (Montées de genoux)',
    description: 'Courir sur place en montant les genoux haut.',
  },
  {
    name: 'Arm Swings (Balancés de bras)',
    description:
      'Croisements de bras devant la poitrine pour les pectoraux et le dos.',
  },
  {
    name: "World's Greatest Stretch",
    description:
      'Grand étirement dynamique complet (fente + rotation thoracique).',
  },
  {
    name: 'Planche (Gainage)',
    description: 'Activation de la sangle abdominale.',
  },
  {
    name: 'Mountain Climbers',
    description: 'Exercice cardio et abdos au sol.',
  },

  // --- EXERCICES (WORKOUT) ---
  // PECTORAUX
  {
    name: 'Développé Couché (Barre)',
    description: 'Exercice roi pour les pectoraux, triceps et épaules.',
  },
  {
    name: 'Pompes (Push-ups)',
    description: 'Classique poids du corps pour les pectoraux.',
  },
  {
    name: 'Développé Incliné (Haltères)',
    description: 'Cible le haut des pectoraux.',
  },
  {
    name: 'Ecarté Couché (Fly)',
    description: 'Isolation pour les pectoraux.',
  },

  // DOS
  {
    name: 'Tractions (Pull-ups)',
    description: 'Exercice fondamental pour la largeur du dos.',
  },
  {
    name: 'Rowing Barre (Bent over row)',
    description: "Pour l'épaisseur du dos.",
  },
  {
    name: 'Tirage Poitrine (Lat Pulldown)',
    description: 'Alternative aux tractions à la poulie.',
  },
  {
    name: 'Soulevé de Terre (Deadlift)',
    description: 'Exercice complet pour toute la chaîne postérieure.',
  },

  // JAMBES
  {
    name: 'Squat (Barre)',
    description: 'Le roi des exercices pour les jambes.',
  },
  {
    name: 'Presse à cuisses',
    description: 'Pour charger lourd sur les jambes en sécurité.',
  },
  {
    name: 'Fentes Bulgares',
    description: 'Unilatéral redoutable pour les fessiers et quadriceps.',
  },
  {
    name: 'Leg Extension',
    description: 'Isolation des quadriceps.',
  },
  {
    name: 'Leg Curl',
    description: 'Isolation des ischio-jambiers.',
  },

  // EPAULES
  {
    name: 'Développé Militaire (Overhead Press)',
    description: 'Force globale des épaules.',
  },
  {
    name: 'Elévations Latérales',
    description: 'Pour la largeur des épaules (faisceau moyen).',
  },
  {
    name: 'Oiseau (Rear Delt Fly)',
    description: "Pour l'arrière des épaules.",
  },

  // BRAS
  {
    name: 'Curl Barre (Biceps)',
    description: 'Classique pour les biceps.',
  },
  {
    name: 'Dips',
    description: 'Excellent pour les triceps et le bas des pecs.',
  },
  {
    name: 'Extension Triceps Poulie',
    description: 'Isolation triceps.',
  },

  // ABDOS
  {
    name: 'Crunchs',
    description: 'Flexion du buste pour les abdominaux.',
  },
  {
    name: 'Relevé de jambes',
    description: 'Cible le bas des abdominaux.',
  },
  {
    name: 'Russian Twist',
    description: 'Pour les obliques.',
  },
];

const seedExercises = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/kettleapp';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // L'ID du coach fourni
    // Note: Assure-toi que c'est un ObjectId valide (24 caractères hex).
    // Si '69975a328f042b5b6078db27' est un exemple, remplace-le par le vrai si différent.
    // D'après ta demande, c'est celui-ci que tu veux utiliser.
    const COACH_ID = '693460efc4e3623b23c357cb';

    console.log(`👤 Création des exercices pour le Coach ID : ${COACH_ID}`);

    // Optionnel : Nettoyer les exercices existants pour ce coach
    await Exercise.deleteMany({ createdBy: COACH_ID });
    console.log('🗑️ Anciens exercices du coach supprimés');

    const exercisesWithCreator = exercises.map((ex) => ({
      ...ex,
      createdBy: COACH_ID, // On assigne directement l'ID ici
    }));

    await Exercise.insertMany(exercisesWithCreator);
    console.log(`🌱 ${exercises.length} exercices ajoutés avec succès !`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding :', error);
    process.exit(1);
  }
};

seedExercises();
