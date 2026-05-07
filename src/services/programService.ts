import { Types } from "mongoose";
import Program, { IProgram } from "../models/Program";

export const getOrCreate = async (
  clientId: Types.ObjectId,
): Promise<IProgram> => {
  let program = await Program.findOne({ clientId });
  if (!program) program = await Program.create({ clientId });
  return program;
};
