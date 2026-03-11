// server.js - MERN To-Do App Backend with JWT Auth + Email alerts + Email OTP verification

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

// Allow requests from any origin (for file:// or Live Server)
app.use(
  cors({
    origin: "*", // you can restrict later
  })
);

// ====== MongoDB Connection (using .env MONGO_URI) ======
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/todo_jwt_db";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected:", conn.connection.host);
    console.log("✅ Database:", conn.connection.name);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

connectDB();

// ====== Nodemailer transporter (Gmail or other SMTP) ======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, // your Gmail
    pass: process.env.MAIL_PASS, // app password
  },
});

transporter.verify((err, success) => {
  if (err) console.error("❌ Mail server error:", err.message);
  else console.log("✅ Mail server ready");
});

// ====== Mongoose Models ======
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  // OTP fields for email verification
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
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function sendOtpMail(toEmail, otp) {
  const mailOptions = {
    from: `"MERN To‑Do · Verify" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Your MERN To‑Do verification code",
    text: `Your verification code is ${otp}. It will expire in 5 minutes.`,
  };
  await transporter.sendMail(mailOptions);
}

// ====== JWT Auth Middleware ======
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "mysecretkey123"
    );
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
}

// ====== Auth Routes ======

// POST /api/register  (now: creates user + sends OTP, does NOT auto-verify)
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });

    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Username or email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = new User({
      username,
      email,
      passwordHash,
      otpCode: otp,
      otpExpiresAt: expires,
      isVerified: false,
    });
    await user.save();

    try {
      await sendOtpMail(email, otp);
    } catch (mailErr) {
      console.error("Error sending OTP email:", mailErr.message);
      // optional: still keep user but inform frontend
    }

    return res.status(201).json({
      message: "User registered. OTP sent to email.",
      userId: user._id,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/verify-otp
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "User and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "Already verified" });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP found. Please resend." });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/resend-otp
app.post("/api/resend-otp", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ message: "User is required" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "Already verified" });
    }

    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    user.otpCode = otp;
    user.otpExpiresAt = expires;
    await user.save();

    try {
      await sendOtpMail(user.email, otp);
    } catch (mailErr) {
      console.error("Error resending OTP email:", mailErr.message);
    }

    return res.json({ message: "OTP resent to your email" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/login (username OR email) – now checks isVerified
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = username or email

    if (!identifier || !password)
      return res
        .status(400)
        .json({ message: "Identifier and password are required" });

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email with the OTP sent to you." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET || "mysecretkey123",
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      user: { username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ====== Task Routes (Protected) ======

// GET /api/tasks - get all tasks for logged-in user
app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    return res.json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks - add new task (with optional deadline)
app.post("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, deadline } = req.body;
    if (!title)
      return res.status(400).json({ message: "Title is required" });

    const task = new Task({
      userId: req.userId,
      title,
      deadline: deadline ? new Date(deadline) : undefined,
    });

    await task.save();

    return res.status(201).json(task);
  } catch (err) {
    console.error("Add task error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/tasks/:id - edit task (title, completed, deadline)
app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const { title, completed, deadline } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (completed !== undefined) update.completed = completed;
    if (deadline !== undefined) {
      update.deadline = deadline ? new Date(deadline) : null;
      update.notified = false;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      update,
      { new: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.json(task);
  } catch (err) {
    console.error("Update task error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/tasks/:id - delete task
app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ====== Email scheduler: check due tasks every minute ======
async function checkDueTasksAndNotify() {
  const now = new Date();

  try {
    const dueTasks = await Task.find({
      deadline: { $lte: now },
      completed: false,
      notified: false,
    }).populate("userId");

    for (const task of dueTasks) {
      const user = task.userId;
      if (!user || !user.email) continue;

      const mailOptions = {
        from: `"MERN To‑Do · Alerts" <${process.env.MAIL_USER}>`,
        to: user.email,
        subject: `⏰ Task due now · ${task.title}`,
        html: `...same HTML you already had...`,
      };

      try {
        await transporter.sendMail(mailOptions);
        task.notified = true;
        await task.save();
        console.log("📧 Due email sent for task:", task.title);
      } catch (err) {
        console.error("Failed to send email:", err.message);
      }
    }
  } catch (err) {
    console.error("checkDueTasksAndNotify error:", err.message);
  }
}

// run every minute
setInterval(checkDueTasksAndNotify, 60 * 1000);

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
