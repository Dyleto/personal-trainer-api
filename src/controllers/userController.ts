import { Request, Response } from "express";
import User from "../models/User";
import { createUserService, getUsersService } from "../services/userService";

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await getUsersService();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await createUserService(req.body);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
