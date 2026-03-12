// server.js - Final Master Code
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ====== Middleware ======
app.use(express.json());

// FIXED: This allows both versions of your Netlify URL (with and without the "a")
app.use(
  cors({
    origin: [
      "https://to-do-a-list-of-applications.netlify.app",
      "https://to-do-list-of-applications.netlify.app"
    ],
    credentials: true,
  })
);

// ====== MongoDB Connection ======
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected:", conn.connection.host);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};
connectDB();

// ====== Nodemailer transporter ======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.error("❌ Mail server error:", err.message);
  else console.log("✅ Mail server ready");
});

// ====== Mongoose Models ======
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  otpCode: { type: String },
  otpExpiresAt: { type: Date },
  isVerified: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    deadline: { type: Date },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

// ====== Helpers for OTP ======
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpMail(toEmail, otp) {
  const mailOptions = {
    from: `"DAILY TASKS Workspace" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Your verification code",
    text: `Your verification code is ${otp}. It will expire in 5 minutes.`,
  };
  await transporter.sendMail(mailOptions);
}

// ====== JWT Auth Middleware ======
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ====== Auth Routes ======

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    const user = new User({
      username,
      email,
      passwordHash,
      otpCode: otp,
      otpExpiresAt: expires,
    });
    await user.save();

    await sendOtpMail(email, otp);
    res.status(201).json({ message: "OTP sent", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify email
app.post("/api/verify-email", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user || user.otpCode !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.isVerified = true;
    user.otpCode = null;
    await user.save();
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resend OTP
app.post("/api/resend-otp", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const otp = generateOtp();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 300000);
    await user.save();
    await sendOtpMail(user.email, otp);
    res.json({ message: "OTP resent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (!user.isVerified) return res.status(403).json({ message: "Verify email first" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { username: user.username } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====== Task Routes ======

app.get("/api/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(tasks);
});

app.post("/api/tasks", authMiddleware, async (req, res) => {
  const task = new Task({ userId: req.userId, title: req.body.title, deadline: req.body.deadline });
  await task.save();
  res.status(201).json(task);
});

app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(task);
});

app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ message: "Deleted" });
});

// ====== Email Scheduler ======
async function checkDueTasks() {
  const now = new Date();
  const dueTasks = await Task.find({
    deadline: { $lte: now },
    completed: false,
    notified: false,
  }).populate("userId");

  for (const task of dueTasks) {
    const user = task.userId;
    if (user && user.email) {
      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: user.email,
        subject: `⏰ Task due: ${task.title}`,
        text: `Task "${task.title}" is due now.`,
      });
      task.notified = true;
      await task.save();
    }
  }
}
setInterval(checkDueTasks, 60000);

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
