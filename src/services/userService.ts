import User from "../models/User.js";

export const createUserService = async (data) => {
  return await User.create(data);
};

export const getUsersService = async () => {
  return await User.find();
};
