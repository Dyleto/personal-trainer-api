import { model, Schema, Types, Document } from "mongoose";

export interface IProgram extends Document {
  name: string;
  clientId: Types.ObjectId;
  coachId: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "completed" | "upcoming";
}

const ProgramSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

ProgramSchema.virtual("status").get(function () {
  const now = new Date();
  if (this.startDate > now) return "upcoming";
  if (this.endDate && this.endDate < now) return "completed";
  return "active";
});

ProgramSchema.set("toJSON", { virtuals: true });
ProgramSchema.set("toObject", { virtuals: true });

ProgramSchema.index({ clientId: 1, startDate: -1 });
ProgramSchema.index({ clientId: 1, coachId: 1 });

const Program = model<IProgram>("Program", ProgramSchema);

export default Program;
