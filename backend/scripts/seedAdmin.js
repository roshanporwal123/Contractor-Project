import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (exists) {
    console.log("Admin already exists");
  } else {
    await User.create({
      name: "Super Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      isEmailVerified: true,
    });
    console.log("Admin created");
  }
  process.exit(0);
};

run();