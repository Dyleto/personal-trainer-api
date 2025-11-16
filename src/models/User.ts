import { Schema, Document, model } from "mongoose";

export interface IUser extends Document {
  email: string;
  picture?: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true },
  picture: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = model<IUser>("User", UserSchema);

export default User;
