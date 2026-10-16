
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function resetAdminPassword() {
  try {
    const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Check MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Use an administrator password of at least 12 characters.");
    }

    await mongoose.connect(MONGODB_URI);

    const email = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      console.log("No account found for this email. Run seedAdmin.js first.");
      return;
    }

    user.passwordHash = passwordHash;
    user.role = "admin";
    await user.save();

    console.log("Administrator password updated successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

await resetAdminPassword();
