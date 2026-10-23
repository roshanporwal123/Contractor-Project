import mongoose from "mongoose";

// Project / Task par comments (PDF: "Comments")
const commentSchema = new mongoose.Schema(
  {
    parentType: {
      type: String,
      enum: ["project", "task"],
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);