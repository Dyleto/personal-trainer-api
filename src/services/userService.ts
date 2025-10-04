import User from "../models/user.js";

export const createUserService = async (data) => {
  return await User.create(data);
};

export const getUsersService = async () => {
  return await User.find();
};
