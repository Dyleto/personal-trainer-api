import { model, Schema, Types } from "mongoose";

export interface IClient extends Document {
  userId: Types.ObjectId;
  coachId?: Types.ObjectId;
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
  coachId: {
    type: Schema.Types.ObjectId,
    ref: "Coach",
  },
  linkedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const Client = model<IClient>("Client", ClientSchema);

export default Client;
