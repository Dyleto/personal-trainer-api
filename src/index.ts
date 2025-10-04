import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import routes from "./routes/index";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173", // front dev
      "https://personal-trainer-tau.vercel.app/users", // front prod
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
