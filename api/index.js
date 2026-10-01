// api/index.js — Aura TaskFlow Backend (Supabase PostgreSQL)
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
const supabase = require("./supabase");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

if (!supabase) {
  console.error("❌ Supabase client failed to initialize. Check SUPABASE_URL and SUPABASE_KEY in .env");
  process.exit(1);
}

console.log("🚀 Database: Supabase PostgreSQL");

// Mailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session token" });
  }
};

// Normalize Supabase task fields to frontend format
const normalizeTask = (t) => ({
  _id: t.id,
  id: t.id,
  userId: t.user_id,
  title: t.title,
  completed: t.completed,
  deadline: t.deadline,
  notified: t.notified,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

// ==============================================================================
// AUTH ROUTES
// ==============================================================================

// POST /api/register
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }

    // Check existing user
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: "User with this username or email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password_hash: passwordHash,
        otp_code: otp,
        otp_expires_at: expires.toISOString(),
        is_verified: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Log OTP in terminal as dev fallback
    console.log(`\n=========================================`);
    console.log(`🔑 OTP for ${email} : ${otp}`);
    console.log(`=========================================\n`);

    // Send OTP email
    try {
      await transporter.sendMail({
        from: `"Aura TaskFlow" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Your verification code — Aura TaskFlow",
        text: `Your verification code is ${otp}. It will expire in 5 minutes.`,
      });
    } catch (mailErr) {
      console.warn("⚠️ Email send failed:", mailErr.message);
    }

    res.status(201).json({ message: "OTP sent", userId: newUser.id, devOtp: otp });
  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/verify-email
app.post("/api/verify-email", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "User ID and OTP are required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) return res.status(400).json({ message: "User not found" });
    if (user.otp_code !== otp || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await supabase
      .from("users")
      .update({ is_verified: true, otp_code: null })
      .eq("id", userId);

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/resend-otp
app.post("/api/resend-otp", async (req, res) => {
  try {
    const { userId } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    const { data: user, error } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (error || !user) return res.status(400).json({ message: "User not found" });

    await supabase
      .from("users")
      .update({ otp_code: otp, otp_expires_at: expires.toISOString() })
      .eq("id", userId);

    console.log(`\n=========================================`);
    console.log(`🔑 Resent OTP for ${user.email} : ${otp}`);
    console.log(`=========================================\n`);

    try {
      await transporter.sendMail({
        from: `"Aura TaskFlow" <${process.env.MAIL_USER}>`,
        to: user.email,
        subject: "Your new verification code — Aura TaskFlow",
        text: `Your new verification code is ${otp}. It will expire in 5 minutes.`,
      });
    } catch (mailErr) {
      console.warn("⚠️ Email send failed:", mailErr.message);
    }

    res.json({ message: "OTP resent successfully", devOtp: otp });
  } catch (err) {
    console.error("Resend OTP Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/login
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = data[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.is_verified) {
      return res.status(403).json({ message: "Please verify your email address first" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ==============================================================================
// TASK ROUTES
// ==============================================================================

// GET /api/tasks
app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(tasks.map(normalizeTask));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks
app.post("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, deadline } = req.body;
    if (!title) return res.status(400).json({ message: "Task title is required" });

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        user_id: req.userId,
        title: title.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        completed: false,
        notified: false,
      })
      .select("*")
      .single();

    if (error) throw error;
    res.status(201).json(normalizeTask(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const { title, completed, deadline } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (completed !== undefined) update.completed = completed;
    if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : null;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .select("*")
      .single();

    if (error || !task) return res.status(404).json({ message: "Task not found" });
    res.json(normalizeTask(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================================================================
// DEADLINE EMAIL NOTIFICATION JOB
// ==============================================================================
async function sendDueTaskEmails() {
  try {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

    const { data: dueTasks, error } = await supabase
      .from("tasks")
      .select("*, users:user_id (email, username)")
      .eq("completed", false)
      .eq("notified", false)
      .gte("deadline", startOfToday.toISOString())
      .lte("deadline", endOfToday.toISOString());

    if (error) throw error;

    for (const task of dueTasks || []) {
      const userEmail = task.users?.email;
      if (!userEmail) continue;

      await transporter.sendMail({
        from: `"Aura TaskFlow" <${process.env.MAIL_USER}>`,
        to: userEmail,
        subject: `Task Due Today: "${task.title}"`,
        text: `Hi ${task.users.username},\n\nYour task "${task.title}" is due today!\n\nBest,\nAura TaskFlow`,
      });

      await supabase.from("tasks").update({ notified: true }).eq("id", task.id);
    }

    console.log(`✅ Due-task job: checked ${(dueTasks || []).length} tasks`);
  } catch (err) {
    console.error("❌ Due-task job error:", err.message);
  }
}

// Manual trigger endpoint (used by Vercel Cron)
app.get("/api/run-due-task-job", async (req, res) => {
  try {
    await sendDueTaskEmails();
    res.json({ message: "Deadline notification job completed." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Aura TaskFlow running at http://localhost:${PORT}`));
}
module.exports = app;
