import express from "express";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import routes from "./src/routes/index.js";

dotenv.config();
const app = express();

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
