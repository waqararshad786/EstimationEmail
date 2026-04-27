const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err) => console.error("✗ MongoDB error:", err));

// Schema
const estimationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  recipients: [{ type: String }],
  attachmentNames: [{ type: String }],
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["sent", "failed", "partial"], default: "sent" },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  failedEmails: [{ type: String }],
});

const Estimation = mongoose.model("Estimation", estimationSchema);

// Email Transporter with rate limiting
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 1,
  rateLimit: true,
  maxMessages: 10,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("✗ Email configuration error:", error);
  } else {
    console.log("✓ Email server ready");
  }
});

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function buildEmailHTML(title, description, senderName) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Estimation</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 36px 40px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; }
    .header p { margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }
    .body { padding: 40px; }
    .subject { font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 20px; }
    .content { font-size: 15px; color: #374151; line-height: 1.8; white-space: pre-wrap; margin: 0 0 32px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 0 0 32px; }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
    .badge { display: inline-block; background: #ede9fe; color: #5b21b6; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Project Estimation</h1>
      <p>Sent via EstiMail • ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    <div class="body">
      <span class="badge">Estimation</span>
      <div class="subject">${escapeHtml(title)}</div>
      <div class="content">${escapeHtml(description).replace(/\n/g, "<br>")}</div>
      <hr class="divider" />
      <p style="margin: 0; font-size: 13px; color: #6b7280;">
        This estimation was prepared and sent by <strong>${escapeHtml(senderName || "EstiMail")}</strong>.
        Please reach out if you have any questions or need clarification.
      </p>
    </div>
    <div class="footer">
      <p>If you didn't expect this email, you can safely ignore it.</p>
      <p style="margin-top: 8px;">Need to unsubscribe? <a href="mailto:${process.env.EMAIL_USER}?subject=Unsubscribe" style="color: #4f46e5;">Click here</a></p>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/send-estimation
app.post("/api/send-estimation", upload.array("attachments", 20), async (req, res) => {
  try {
    const { title, description } = req.body;
    const emails = JSON.parse(req.body.emails || "[]");
    const files = req.files || [];

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "No recipient emails provided" });
    }
    if (emails.length > 20) {
      return res.status(400).json({ message: "Maximum 20 recipients allowed" });
    }
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    const sentEmails = [];
    const failedEmails = [];

    // Send with delay between emails
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        // Delay between emails to avoid spam detection
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
        
        const htmlContent = buildEmailHTML(title, description, process.env.SENDER_NAME || "EstiMail");
        
        await transporter.sendMail({
          from: `"${process.env.SENDER_NAME || "EstiMail"}" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Estimation: ${title}`,
          html: htmlContent,
          text: stripHtml(htmlContent),
          attachments,
          headers: {
            'X-Priority': '3',
            'X-Mailer': 'EstiMail',
            'X-Auto-Response-Suppress': 'OOF, AutoReply',
          }
        });
        sentEmails.push(email);
        console.log(`✓ Sent to ${email} (${i+1}/${emails.length})`);
      } catch (err) {
        console.error(`✗ Failed to send to ${email}:`, err.message);
        failedEmails.push(email);
      }
    }

    const status = failedEmails.length === 0 ? "sent" : sentEmails.length === 0 ? "failed" : "partial";
    const record = new Estimation({
      title,
      description,
      recipients: emails,
      attachmentNames: files.map((f) => f.originalname),
      status,
      sentCount: sentEmails.length,
      failedCount: failedEmails.length,
      failedEmails,
    });
    await record.save();

    res.json({
      success: true,
      sent: sentEmails.length,
      failed: failedEmails.length,
      failedEmails,
      status,
      message: `Sent to ${sentEmails.length} recipient(s)${failedEmails.length ? `, failed for ${failedEmails.length}` : ""}`,
    });
  } catch (err) {
    console.error("Send estimation error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/estimations", async (req, res) => {
  try {
    const estimations = await Estimation.find().sort({ sentAt: -1 }).limit(50);
    res.json(estimations);
  } catch (err) {
    res.status(500).json({ message: "Error fetching estimations" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" 
  });
});

app.listen(PORT, () => console.log(`✓ EstiMail server running on http://localhost:${PORT}`));