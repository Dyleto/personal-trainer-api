import { model, Schema, Types } from "mongoose";
import { IUser } from "./User";

export interface ICoach extends Document {
  userId: IUser | Types.ObjectId;
  clients: Types.ObjectId[];
  createdAt: Date;
}

const CoachSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  clients: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  createdAt: { type: Date, default: Date.now },
});

const Coach = model<ICoach>("Coach", CoachSchema);

export default Coach;
