import { model, Schema, Types } from "mongoose";
import { IUser } from "./User";

export interface CoachLink {
  coachId: Types.ObjectId;
  linkedAt: Date;
}

export interface IClient extends Document {
  userId: IUser | Types.ObjectId;
  coaches: CoachLink[];
  linkedAt?: Date;
  createdAt: Date;
}

const ClientSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  coaches: [
    {
      coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
      linkedAt: { type: Date, default: Date.now },
    },
  ],
  linkedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Index pour éviter les doublons de coaches
ClientSchema.index(
  { userId: 1, "coaches.coachId": 1 },
  { unique: true, sparse: true }
);

const Client = model<IClient>("Client", ClientSchema);

export default Client;
