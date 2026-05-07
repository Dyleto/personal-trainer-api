import User, { IUser } from "../models/User";
import Coach from "../models/Coach";
import Client from "../models/Client";

export const createUserService = async (data: IUser): Promise<IUser> => {
  const newUser = new User(data);
  return await newUser.save();
};

export const getUsersService = async (): Promise<IUser[]> => {
  return await User.find();
};

export const buildUser = async (user: IUser) => {
  const [isCoach, isClient] = await Promise.all([
    Coach.findOne({ userId: user._id }),
    Client.findOne({ userId: user._id }),
  ]);

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    picture: user.picture,
    isAdmin: user.isAdmin,
    isCoach: !!isCoach,
    isClient: !!isClient,
  };
};
