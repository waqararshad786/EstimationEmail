const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// EmailEngine Configuration
const EMAILENGINE_URL = process.env.EMAILENGINE_URL || "http://localhost:3000";
const EMAILENGINE_ACCOUNT = process.env.EMAILENGINE_ACCOUNT;

// EmailEngine API client
const emailEngineApi = axios.create({
  baseURL: `${EMAILENGINE_URL}/api`,
  headers: {
    'Authorization': `Bearer ${process.env.EMAILENGINE_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Create webhook to receive delivery status
app.post("/api/webhook/email-status", async (req, res) => {
  const { messageId, email, status, folder } = req.body;
  
  console.log(`📬 Webhook received: ${email} → ${status} (${folder || 'unknown'})`);
  
  try {
    // Update database with real delivery status
    await BatchEstimation.updateOne(
      { "estimations.trackingData.messageId": messageId },
      { 
        $set: { 
          "estimations.$.trackingData.$[elem].status": status,
          "estimations.$.trackingData.$[elem].folder": folder,
          "estimations.$.trackingData.$[elem].deliveredAt": new Date()
        }
      },
      { arrayFilters: [{ "elem.messageId": messageId }] }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

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

// Schema with proper tracking fields
const batchEstimationSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  estimations: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    recipients: [{ type: String }],
    attachmentNames: [{ type: String }],
    status: { type: String, enum: ["sent", "failed", "pending", "partial"], default: "pending" },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    spamCount: { type: Number, default: 0 },
    inboxCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    failedEmails: [{ type: String }],
    spamEmails: [{ type: String }],
    inboxEmails: [{ type: String }],
    openedEmails: [{ type: String }],
    trackingData: [{
      email: String,
      messageId: String,
      status: String,
      folder: String,
      sentAt: Date,
      deliveredAt: Date,
      openedAt: Date
    }],
    sentAt: { type: Date }
  }],
  totalEstimations: { type: Number, default: 0 },
  totalSent: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  totalSpam: { type: Number, default: 0 },
  totalInbox: { type: Number, default: 0 },
  totalOpened: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["completed", "partial", "failed", "processing"], default: "processing" }
});

const BatchEstimation = mongoose.model("BatchEstimation", batchEstimationSchema);

// Standard SMTP transporter (for sending)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("✗ Email configuration error:", error);
  } else {
    console.log("✓ Email server ready");
  }
});

// Simple plain text email
function buildSimpleEmail(title, description) {
  const cleanDescription = description.replace(/<[^>]*>/g, '');
  return `${title}\n\n${cleanDescription}\n\n--\nSent from Arkline Estimate`;
}

// DISTRIBUTE recipients evenly
function distributeRecipients(recipients, estimationsCount) {
  const distributed = [];
  const recipientsPerEstimation = Math.ceil(recipients.length / estimationsCount);
  
  for (let i = 0; i < estimationsCount; i++) {
    const start = i * recipientsPerEstimation;
    const end = Math.min(start + recipientsPerEstimation, recipients.length);
    distributed.push(recipients.slice(start, end));
  }
  
  return distributed;
}

// POST /api/send-batch-estimations
app.post("/api/send-batch-estimations", upload.array("attachments", 20), async (req, res) => {
  try {
    const { batchName, estimationsData, recipients } = JSON.parse(req.body.batchData);
    const files = req.files || [];

    if (!estimationsData || !Array.isArray(estimationsData) || estimationsData.length === 0) {
      return res.status(400).json({ message: "No estimations provided" });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: "No recipients provided" });
    }

    if (recipients.length > 300) {
      return res.status(400).json({ message: "Maximum 300 recipients allowed" });
    }

    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    const distributedRecipients = distributeRecipients(recipients, estimationsData.length);
    
    console.log("\n📊 Distribution Plan:");
    estimationsData.forEach((est, idx) => {
      console.log(`   ${idx+1}. "${est.title}" → ${distributedRecipients[idx].length} recipients`);
    });

    // Create batch record
    const batchRecord = new BatchEstimation({
      batchName: batchName || `Batch ${new Date().toLocaleString()}`,
      estimations: estimationsData.map((est, idx) => ({
        title: est.title,
        description: est.description,
        recipients: distributedRecipients[idx],
        attachmentNames: files.map((f) => f.originalname),
        status: "pending",
        trackingData: []
      })),
      totalEstimations: estimationsData.length,
      status: "processing"
    });

    await batchRecord.save();

    const results = [];
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < estimationsData.length; i++) {
      const estimation = estimationsData[i];
      const estimationRecipients = distributedRecipients[i];
      const sentEmails = [];
      const failedEmails = [];
      const spamEmails = [];
      const inboxEmails = [];
      const trackingData = [];
      
      console.log(`\n📧 Sending "${estimation.title}" to ${estimationRecipients.length} recipients...`);
      
      for (let j = 0; j < estimationRecipients.length; j += BATCH_SIZE) {
        const batch = estimationRecipients.slice(j, j + BATCH_SIZE);
        const batchPromises = batch.map(async (email, index) => {
          try {
            const delay = 2000 + (Math.random() * 3000);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const plainTextContent = buildSimpleEmail(
              estimation.title,
              estimation.description
            );
            
            const messageId = `${Date.now()}.${Math.random()}@estimail.local`;
            
            const mailOptions = {
              from: `"${process.env.SENDER_NAME || "Arkline Estimate"}" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: estimation.title,
              text: plainTextContent,
              attachments: attachments,
              headers: {
                'X-Priority': '3',
                'X-Mailer': 'ArklineEstimate',
                'X-Auto-Response-Suppress': 'OOF, AutoReply',
                'Message-ID': `<${messageId}>`
              }
            };
            
            await transporter.sendMail(mailOptions);
            
            // Store tracking info
            const trackEntry = {
              email: email,
              messageId: messageId,
              status: "sent",
              folder: "pending",
              sentAt: new Date()
            };
            trackingData.push(trackEntry);
            
            console.log(`  ✅ [${j+index+1}/${estimationRecipients.length}] Sent to ${email} (Tracking: ${messageId})`);
            
            // NOTE: Real inbox/spam status will come via webhook
            // For now, we can't know immediately - EmailEngine will update later
            console.log(`  ⏳ Delivery status will be available via webhook in a few minutes`);
            
            return { email, success: true, messageId };
          } catch (err) {
            console.error(`  ❌ [${j+index+1}/${estimationRecipients.length}] Failed to send to ${email}:`, err.message);
            failedEmails.push(email);
            return { email, success: false, error: err.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            sentEmails.push(result.email);
          }
        });
        
        if (j + BATCH_SIZE < estimationRecipients.length) {
          const batchDelay = 3000 + (Math.random() * 2000);
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }
      
      // Update estimation record
      batchRecord.estimations[i].status = failedEmails.length === 0 ? "sent" : (sentEmails.length === 0 ? "failed" : "partial");
      batchRecord.estimations[i].sentCount = sentEmails.length;
      batchRecord.estimations[i].failedCount = failedEmails.length;
      batchRecord.estimations[i].failedEmails = failedEmails;
      batchRecord.estimations[i].trackingData = trackingData;
      batchRecord.estimations[i].sentAt = new Date();
      
      batchRecord.totalSent += sentEmails.length;
      batchRecord.totalFailed += failedEmails.length;
      
      results.push({
        title: estimation.title,
        totalRecipients: estimationRecipients.length,
        sent: sentEmails.length,
        failed: failedEmails.length,
        status: batchRecord.estimations[i].status,
        trackingInfo: `Delivery status will be updated via webhook`
      });
      
      console.log(`✅ Completed "${estimation.title}": ${sentEmails.length}/${estimationRecipients.length} sent`);
      
      if (i < estimationsData.length - 1) {
        const estimationDelay = 5000 + (Math.random() * 3000);
        await new Promise(resolve => setTimeout(resolve, estimationDelay));
      }
    }
    
    batchRecord.status = batchRecord.totalFailed === 0 ? "completed" : 
                         (batchRecord.totalSent === 0 ? "failed" : "partial");
    await batchRecord.save();
    
    res.json({
      success: true,
      batchId: batchRecord._id,
      batchName: batchRecord.batchName,
      totalEstimations: estimationsData.length,
      totalRecipients: recipients.length,
      totalEmailsSent: batchRecord.totalSent,
      totalSent: batchRecord.totalSent,
      totalFailed: batchRecord.totalFailed,
      results: results,
      message: `✅ Sent ${batchRecord.totalSent} emails. Delivery status (inbox/spam) will be updated via webhook.`
    });
    
  } catch (err) {
    console.error("Batch send error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /api/batch-estimations
app.get("/api/batch-estimations", async (req, res) => {
  try {
    const batches = await BatchEstimation.find().sort({ createdAt: -1 }).limit(50);
    res.json(batches);
  } catch (err) {
    console.error("Error fetching batches:", err);
    res.status(500).json({ message: "Error fetching batches" });
  }
});

// GET /api/batch-estimations/:id
app.get("/api/batch-estimations/:id", async (req, res) => {
  try {
    const batch = await BatchEstimation.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json(batch);
  } catch (err) {
    console.error("Error fetching batch:", err);
    res.status(500).json({ message: "Error fetching batch" });
  }
});

// GET /api/delivery-status/:batchId
app.get("/api/delivery-status/:batchId", async (req, res) => {
  try {
    const batch = await BatchEstimation.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    
    // Aggregate delivery stats from tracking data
    let totalInbox = 0, totalSpam = 0, totalOpened = 0;
    
    batch.estimations.forEach(est => {
      est.trackingData?.forEach(track => {
        if (track.folder === "INBOX") totalInbox++;
        if (track.folder === "SPAM") totalSpam++;
        if (track.openedAt) totalOpened++;
      });
    });
    
    res.json({
      batchId: batch._id,
      totalInbox,
      totalSpam,
      totalOpened,
      pendingUpdates: batch.totalSent - (totalInbox + totalSpam)
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching delivery status" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" 
  });
});

app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));