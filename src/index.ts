import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import routes from "./routes/index";
import cookieParser from "cookie-parser";
import session from "express-session";
import authRoutes from "./routes/auth";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { globalErrorHandler } from "./middleware/errorHandler";
import { httpLogger } from "./middleware/httpLogger";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

import { validateEnv } from "./config/env";
validateEnv();

const app = express();

app.set("trust proxy", 1);

// CORS en premier — doit précéder tout middleware qui peut rejeter des requêtes,
// sinon les réponses d'erreur (429, 5xx…) n'ont pas les headers CORS et le
// navigateur affiche une "CORS error" masquant le vrai problème.
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://kettleapp.fr",
      "https://www.kettleapp.fr",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());

// Sécurité Injection NoSQL
app.use(mongoSanitize());

app.use(httpLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  // Ne pas rate-limiter les preflight OPTIONS : ils ne consomment pas de ressources
  // et les bloquer masque les vraies erreurs CORS.
  skip: (req) => req.method === "OPTIONS",
});

app.use(limiter);

app.use(cookieParser());
app.use(express.json());

// Health check endpoint (avant les autres routes)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Session middleware
app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      touchAfter: 24 * 3600, // Lazy session update (1 day)
      collectionName: "auth_sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
      domain:
        process.env.NODE_ENV === "production" ? ".kettleapp.fr" : undefined,
    },
  }),
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", routes);

app.use("*", (req, res, next) => {
  const err: any = new Error(`Route ${req.originalUrl} non trouvée`);
  err.statusCode = 404;
  next(err);
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// DB + Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
