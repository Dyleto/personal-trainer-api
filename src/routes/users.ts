import { Router, Request, Response } from "express";
import User from "../models/user";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const users = await User.find();
  res.json(users);
});

router.post("/", async (req: Request, res: Response) => {
  const newUser = new User(req.body);
  const savedUser = await newUser.save();
  res.json(savedUser);
});

export default router;
