import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Firebase Client SDK for Server (fallback for IAM Issues)
  let clientDb: any = null;
  const SYSTEM_TOKEN = "SECRET_CRM_2026";
  
  try {
    const { initializeApp: initializeClientApp } = await import("firebase/app");
    const { getFirestore: getClientFirestore } = await import("firebase/firestore");
    
    const fs = await import("fs");
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    const clientApp = initializeClientApp(firebaseConfig, "client-server-app");
    clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Client SDK initialized on server (for rules-based writes)");
  } catch (e: any) {
    console.error("Firebase Client SDK init failed:", e.message);
  }

  app.set("trust proxy", true);
  app.use(express.json());

  // Firebase Admin Initialization
  let adminDb: any = null;
  let initError: string | null = null;
  let FieldValue: any = null;
  let activeDbId: string = "(default)";
  
  try {
    const adminApp = await import("firebase-admin/app");
    const adminFirestore = await import("firebase-admin/firestore");
    
    const fs = await import("fs");
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    let app;
    if (!adminApp.getApps().length) {
      app = adminApp.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      app = adminApp.getApps()[0];
    }
    
    FieldValue = adminFirestore.FieldValue;

    // Strategy: Try candidate database IDs.
    // In many environments, the (default) database is the most reliable one to start with.
    // We check BOTH the one from config and the (default) one.
    const configDbId = firebaseConfig.firestoreDatabaseId;
    const candidates = ["(default)"];
    if (configDbId && configDbId !== "(default)") {
      candidates.unshift(configDbId); // Try the configured one first, then fallback
    }
    
    for (const dbId of candidates) {
      try {
        console.log(`Connecting to Firestore: ${dbId} (Project: ${firebaseConfig.projectId})`);
        const db = adminFirestore.getFirestore(app, dbId === "(default)" ? undefined : dbId);
        
        // Connectivity test: We try to get a document. 
        // 5 NOT_FOUND -> Database definitely doesn't exist.
        // 7 PERMISSION_DENIED -> Database exists but rules blocked us (common in some restricted environments).
        // SUCCESS -> Database exists and we have read access.
        try {
          await db.collection("_health_check_").limit(1).get();
          console.log(`Bingo! Connected and verified: ${dbId}`);
        } catch (e: any) {
          if (e.message.includes("PERMISSION_DENIED") || e.code === 7) {
            console.log(`Database ${dbId} exists but returned PERMISSION_DENIED. Accepting as active database.`);
          } else if (e.message.includes("NOT_FOUND") || e.code === 5) {
            throw e; // DATABASE NOT FOUND, continue to next candidate
          } else {
            console.warn(`Database ${dbId} connectivity test failed with: ${e.message}. Proceeding anyway.`);
          }
        }
        
        adminDb = db;
        activeDbId = dbId;
        initError = null;
        break;
      } catch (e: any) {
        console.warn(`Candidate ${dbId} rejected: ${e.message}`);
        initError = `Last attempt (${dbId}): ${e.message}`;
      }
    }

    if (!adminDb) {
      console.error("FATAL: No Firestore database instances could be reached.");
      // Fallback instance anyway to prevent null pointers later
      adminDb = adminFirestore.getFirestore(app);
    }

  } catch (error: any) {
    initError = error.message;
    console.error("Firebase Admin fatal init failed:", error.stack || error.message);
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "MedCRM API is running" });
  });

  // Telegram Webhook
  app.post("/api/webhooks/telegram", async (req, res) => {
    const update = req.body;
    console.log("[Telegram Webhook] Received update:", JSON.stringify(update));
    
    // Log to DB for debugging
    if (adminDb || clientDb) {
      const logData = {
        timestamp: new Date().toISOString(),
        update: JSON.stringify(update).substring(0, 1000),
        systemToken: SYSTEM_TOKEN
      };
      if (adminDb) adminDb.collection("tg_logs").add(logData).catch(() => {});
    }

    const { message } = update;
    
    if (!message) return res.sendStatus(200);
    if (!adminDb && !clientDb) {
      console.error("[Telegram Webhook] No database attached!");
      return res.sendStatus(200);
    }

    const chatId = message.chat.id.toString();
    const text = message.text || (message.caption ? `${message.caption} [Media]` : "[Media/Attachment]");
    const from = message.from || { first_name: "Telegram User", id: chatId };
    const senderName = from.first_name + (from.last_name ? ` ${from.last_name}` : "");

    try {
      const { collection, addDoc, doc: fireDoc, setDoc } = await import("firebase/firestore");
      
      const leadData = {
        fullName: senderName,
        source: "telegram",
        externalId: chatId,
        status: "new",
        systemToken: SYSTEM_TOKEN, // Bypass rules
        updatedAt: new Date().toISOString()
      };

      // Use chatId as document ID for leads to avoid lookup-before-write
      // First try Admin SDK
      if (adminDb) {
        try {
          // Use .set with merge to avoid duplicates without needing a 'read'
          await adminDb.collection("leads").doc(chatId).set({
            ...leadData,
            createdAt: new Date().toISOString() // This might overwrite createdAt, but it's acceptable for this fix
          }, { merge: true });
        } catch (e) {
          console.log("Admin leads set failed, trying client SDK...");
          if (clientDb) {
            await setDoc(fireDoc(clientDb, "leads", chatId), {
              ...leadData,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      }

      // 2. Add message to Firestore
      const messageData = {
        text,
        senderId: chatId,
        senderName,
        receiverId: "system",
        channel: "telegram",
        externalChatId: chatId,
        read: false,
        systemToken: SYSTEM_TOKEN, // Bypass rules
        createdAt: new Date().toISOString()
      };

      try {
        if (adminDb) await adminDb.collection("messages").add(messageData);
        else throw new Error("No adminDb");
      } catch (e) {
        if (clientDb) await addDoc(collection(clientDb, "messages"), messageData);
      }

      // 3. Add activity log
      const activityData = {
        user: senderName,
        action: "Telegram orqali yangi xabar yozdi",
        type: "chat",
        systemToken: SYSTEM_TOKEN,
        createdAt: new Date().toISOString()
      };

      try {
        if (adminDb) await adminDb.collection("activities").add(activityData);
        else if (clientDb) await addDoc(collection(clientDb, "activities"), activityData);
      } catch (e) {}

      res.sendStatus(200);
    } catch (err) {
      console.error("Telegram webhook error:", err);
      res.sendStatus(200); // Always send 200 to Telegram to stop retries on persistent DB errors
    }
  });

  // Meta Webhook Verification (Required by Meta to verify your server)
  app.get(["/api/webhooks/meta", "/api/webhooks/meta/", "/api/webhooks/instagram"], (req, res) => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    const verifyToken = process.env.VITE_META_VERIFY_TOKEN || "shxtt-crm";

    // Debugging: Log the hit to Firestore so the user can verify Meta reached us
    if (adminDb || clientDb) {
      const logData = {
        mode,
        tokenReceived: token || "MISSING",
        tokenExpected: verifyToken,
        success: (mode === "subscribe" && token === verifyToken),
        challenge: challenge || challenge || "MISSING",
        systemToken: SYSTEM_TOKEN,
        timestamp: new Date().toISOString(),
        fullQuery: req.query
      };

      if (adminDb) adminDb.collection("meta_logs").add(logData).catch(() => {});
      else if (clientDb) {
        import("firebase/firestore").then(m => m.addDoc(m.collection(clientDb, "meta_logs"), logData)).catch(() => {});
      }
    }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Meta Webhook Verified Successfully");
      res.status(200).send(challenge);
    } else if (!mode) {
      res.send("MedCRM Meta Webhook is active and waiting for verification.");
    } else {
      console.warn(`[Meta Webhook] Verification failed. Expected ${verifyToken}, got ${token}`);
      res.status(403).send("Verification failed: Token mismatch.");
    }
  });

  // Debug route to see Meta Webhook hits and DB state
  app.get("/api/debug/meta", async (req, res) => {
    try {
      const fs = await import("fs");
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const { collection, query, getDocs, orderBy, limit } = await import("firebase/firestore");

      let metaLogs = [];
      let postLogs = [];
      let tgLogs = [];
      let dbError = null;

      if (adminDb || clientDb) {
        try {
          if (adminDb) {
            const getSnap = await adminDb.collection("meta_logs").orderBy("timestamp", "desc").limit(5).get();
            const postSnap = await adminDb.collection("meta_post_logs").orderBy("timestamp", "desc").limit(10).get();
            const tgSnap = await adminDb.collection("tg_logs").orderBy("timestamp", "desc").limit(10).get();
            metaLogs = getSnap.docs.map((d: any) => d.data());
            postLogs = postSnap.docs.map((d: any) => d.data());
            tgLogs = tgSnap.docs.map((d: any) => d.data());
          } else {
            const q1 = query(collection(clientDb, "meta_logs"), orderBy("timestamp", "desc"), limit(5));
            const q2 = query(collection(clientDb, "meta_post_logs"), orderBy("timestamp", "desc"), limit(10));
            const q3 = query(collection(clientDb, "tg_logs"), orderBy("timestamp", "desc"), limit(10));
            const getSnap = await getDocs(q1);
            const postSnap = await getDocs(q2);
            const tgSnap = await getDocs(q3);
            metaLogs = getSnap.docs.map((d: any) => d.data());
            postLogs = postSnap.docs.map((d: any) => d.data());
            tgLogs = tgSnap.docs.map((d: any) => d.data());
          }
        } catch (e: any) {
          dbError = e.message;
        }
      }

      res.json({
        message: "MedCRM Debug Portal",
        database: {
          activeId: activeDbId,
          configId: firebaseConfig.firestoreDatabaseId,
          status: adminDb ? "Attached" : "Not Attached",
          error: initError || dbError
        },
        metaVerification: metaLogs,
        metaEvents: postLogs,
        telegramUpdates: tgLogs
      });
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  // Unified Meta Webhook (Handles IG Messages, Comments, and Lead Ads)
  app.post(["/api/webhooks/meta", "/api/webhooks/instagram"], async (req, res) => {
    const { object, entry } = req.body;
    
    // Debugging: Log every POST hit for live verification
    if (adminDb || clientDb) {
      const postLog = {
        object,
        entry_meta: entry ? JSON.stringify(entry).substring(0, 500) : "empty",
        timestamp: new Date().toISOString(),
        systemToken: SYSTEM_TOKEN,
        headers: req.headers
      };

      if (adminDb) adminDb.collection("meta_post_logs").add(postLog).catch(() => {});
      else if (clientDb) {
        import("firebase/firestore").then(m => m.addDoc(m.collection(clientDb, "meta_post_logs"), postLog)).catch(() => {});
      }
    }

    if (!adminDb && !clientDb) return res.sendStatus(200);

    try {
      const { collection, addDoc, doc: fireDoc, setDoc, query, where, getDocs, limit } = await import("firebase/firestore");

      for (const item of entry) {
        // 1. Handle Instagram Messages
        if (object === "instagram" && item.messaging) {
          const messaging = item.messaging[0];
          const senderId = messaging.sender.id;
          const text = messaging.message?.text;

          // Create/Update Lead idempotently
          const leadData = {
            fullName: `Instagram DM User (${senderId.slice(-4)})`,
            source: "instagram",
            externalId: senderId,
            status: "new",
            systemToken: SYSTEM_TOKEN,
            updatedAt: new Date().toISOString()
          };

          if (adminDb) {
            try {
              await adminDb.collection("leads").doc(senderId).set({
                ...leadData,
                createdAt: new Date().toISOString()
              }, { merge: true });
            } catch (e) {
              if (clientDb) {
                await setDoc(fireDoc(clientDb, "leads", senderId), {
                  ...leadData,
                  createdAt: new Date().toISOString()
                }, { merge: true });
              }
            }
          } else if (clientDb) {
            await setDoc(fireDoc(clientDb, "leads", senderId), {
              ...leadData,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }

          // Add Message
          const newMessageData = {
            text,
            senderId,
            senderName: "Instagram User",
            receiverId: "system",
            channel: "instagram",
            externalChatId: senderId,
            read: false,
            systemToken: SYSTEM_TOKEN,
            createdAt: new Date().toISOString()
          };

          if (adminDb) {
            try {
              await adminDb.collection("messages").add(newMessageData);
            } catch (e) {
              if (clientDb) await addDoc(collection(clientDb, "messages"), newMessageData);
            }
          } else if (clientDb) {
            await addDoc(collection(clientDb, "messages"), newMessageData);
          }
        }

        // 2. Handle Meta Lead Ads (Recurs through changes)
        if (item.changes) {
          for (const change of item.changes) {
            if (change.field === "leadgen") {
              const leadgenId = change.value.leadgen_id;
              console.log(`[Meta Ads] New Lead Received: ${leadgenId}`);

              const adLeadData = {
                fullName: "Yangi Lead (Instagram Ads)",
                source: "instagram",
                externalId: leadgenId,
                status: "new",
                is_ad_lead: true,
                systemToken: SYSTEM_TOKEN,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              if (adminDb) {
                try {
                  await adminDb.collection("leads").add(adLeadData);
                } catch (e) {
                  if (clientDb) await addDoc(collection(clientDb, "leads"), adLeadData);
                }
              } else if (clientDb) {
                await addDoc(collection(clientDb, "leads"), adLeadData);
              }
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error("Meta webhook processing error:", err);
      res.sendStatus(200); // Always 200 for Meta too
    }
  });

  // Telegram Setup API (Triggered from Frontend)
  app.post("/api/integrations/telegram/setup", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
      const isDev = req.hostname.includes("-dev-");
      const webhookUrl = `https://${req.hostname}/api/webhooks/telegram`;
      
      console.log(`[Telegram Setup] Setting webhook to: ${webhookUrl} (Dev: ${isDev})`);
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
      const data = await response.json();

      if (data.ok) {
        res.json({ 
          success: true, 
          message: isDev 
            ? "Webhook set, but you are on a Development URL. Telegram might not be able to reach this URL due to authentication. Please use the Shared/Production URL for the bot to work."
            : "Telegram Webhook set successfully!" 
        });
      } else {
        console.error(`[Telegram Setup] Failed: ${data.description}`);
        res.status(400).json({ error: data.description });
      }
    } catch (err) {
      console.error(`[Telegram Setup] Critical Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/privacy", (req, res) => {
    res.send(`
      <html>
        <head><title>Privacy Policy - MedCRM</title></head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto;">
          <h1>Privacy Policy</h1>
          <p>Effective Date: April 20, 2026</p>
          <p>MedCRM ("we", "us", or "our") operates the MedCRM platform. This policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.</p>
          <h2>1. Information Collection and Use</h2>
          <p>We collect direct messages and lead information from social media integrations (Instagram, Telegram) solely for the purpose of managing customer relationships within your CRM account.</p>
          <h2>2. Data Security</h2>
          <p>The security of your data is important to us, and we use Firebase (Google Cloud) to store and protect your information.</p>
          <h2>3. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at magicalfx426@gmail.com.</p>
        </body>
      </html>
    `);
  });

  app.get("/terms", (req, res) => {
    res.send(`
      <html>
        <head><title>Terms of Service - MedCRM</title></head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto;">
          <h1>Terms of Service</h1>
          <p>By using the MedCRM platform, you agree to these terms.</p>
          <h2>1. Use of Integration</h2>
          <p>This application integrates with Meta Graph API to facilitate messaging and lead management for business purposes only.</p>
          <h2>2. Data Handling</h2>
          <p>Users are responsible for ensuring they have the right to store customer information provided via these integrations.</p>
          <h2>3. Liability</h2>
          <p>MedCRM is not liable for any service interruptions caused by third-party API providers like Meta or Telegram.</p>
        </body>
      </html>
    `);
  });

  // API to send message back to external channels
  app.post("/api/messages/send", async (req, res) => {
    const { text, receiverId, channel, externalChatId } = req.body;
    if (!adminDb && !clientDb) return res.status(500).json({ error: "DB not initialized" });

    try {
      const { collection, addDoc } = await import("firebase/firestore");

      // Save to local DB History
      const historyData = {
        text,
        senderId: "system", // The platform user
        senderName: "Admin",
        receiverId,
        channel,
        externalChatId,
        read: true,
        systemToken: SYSTEM_TOKEN,
        createdAt: new Date().toISOString()
      };

      try {
        if (adminDb) await adminDb.collection("messages").add(historyData);
        else throw new Error("No adminDb");
      } catch (e) {
        if (clientDb) await addDoc(collection(clientDb, "messages"), historyData);
      }

      // Real integration would call Telegram/Instagram API here
      if (channel === 'telegram') {
        let token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
          try {
            if (adminDb) {
              const integrationDoc = await adminDb.collection("integrations").doc("telegram").get();
              if (integrationDoc.exists) token = integrationDoc.data().token;
            }
          } catch(e) {}
        }

        if (token) {
          const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: externalChatId, text: text })
          });
          const result = await response.json();
          if (result.ok) {
            return res.json({ success: true });
          } else {
            console.error("Failed to send TG message:", result.description);
            return res.status(400).json({ error: "Telegram API xatosi: " + result.description });
          }
        } else {
          return res.status(400).json({ error: "Telegram Bot Token topilmadi." });
        }
      } 
      
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Outbound message error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
