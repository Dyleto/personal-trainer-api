import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import routes from "./src/routes/index.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173", // front dev
      "https://personal-trainer-fynm264op-dyletos-projects.vercel.app", // front prod
    ],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api", routes);

const PORT = process.env.PORT || 3000;

// DB + Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
