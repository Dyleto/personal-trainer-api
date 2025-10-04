import { createUserService, getUsersService } from "../services/userService.js";

export const createUser = async (req, res) => {
  try {
    const user = await createUserService(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await getUsersService();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
