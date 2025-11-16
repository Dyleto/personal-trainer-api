import { model, Schema, Types } from "mongoose";
import { randomBytes } from "crypto";

export interface IInvitationToken extends Document {
  coachId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const InvitationTokenSchema: Schema = new Schema({
  coachId: {
    type: Schema.Types.ObjectId,
    ref: "Coach",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => randomBytes(32).toString("hex"),
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

const InvitationToken = model<IInvitationToken>(
  "InvitationToken",
  InvitationTokenSchema
);

export default InvitationToken;
