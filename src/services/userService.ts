import User, { IUser } from "../models/User";

export const createUserService = async (data: IUser): Promise<IUser> => {
  const newUser = new User(data);
  return await newUser.save();
};

export const getUsersService = async (): Promise<IUser[]> => {
  return await User.find();
};
