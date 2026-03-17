import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";

require('dotenv').config({ override: true });
console.log('Gemini API Key loaded:', !!process.env.GEMINI_API_KEY);
console.log('PORT:', process.env.PORT);

async function analyzePost(post, ai) {
  console.log('Analyzing post:', post.slice(0,50) + '...', !!ai ? 'WITH AI' : 'DEMO');
  if (!ai) {
    return {
      post,
      riskLevel: "Low",
      riskScore: 0,
      reason: "Demo mode - no API key. Add GEMINI_API_KEY to .env for AI analysis.",
      suggestedAction: "Safe"
    };
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Analyze the following social media post for potential visa risk (e.g., extremist views, illegal activities, intent to work illegally, or controversial political statements that might trigger secondary inspection).
      
      POST CONTENT: "${post}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: {
              type: Type.STRING,
              description: "Risk level: Low, Medium, or High",
            },
            riskScore: {
              type: Type.NUMBER,
              description: "Risk score from 0 to 100",
            },
            reason: {
              type: Type.STRING,
              description: "Short explanation of the risk",
            },
            suggestedAction: {
              type: Type.STRING,
              description: "Action: Delete, Archive, or Safe",
            },
          },
          required: ["riskLevel", "riskScore", "reason", "suggestedAction"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      post,
      riskLevel: result.riskLevel || "Low",
      riskScore: result.riskScore || 0,
      reason: result.reason || "No risk detected.",
      suggestedAction: result.suggestedAction || "Safe",
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return {
      post,
      riskLevel: "Low",
      riskScore: 0,
      reason: "Analysis failed.",
      suggestedAction: "Safe",
    };
  }
}

async function startServer() {
  let ai = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  const app = express();
  const PORT = parseInt(process.env.PORT || '5000');

  console.log(`Starting server on port ${PORT}`);

  // Configure Multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  // API Route: Handle Archive Upload
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const platform = req.body.platform;
      const posts: string[] = [];

      if (req.file.mimetype === "application/zip" || req.file.originalname.endsWith(".zip")) {
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          const entryName = entry.entryName.toLowerCase();
          
          // Instagram Parser
          if (platform === "instagram" && entryName.includes("posts/") && entryName.endsWith(".json")) {
            const data = JSON.parse(entry.getData().toString("utf8"));
            if (Array.isArray(data)) {
              data.forEach(item => {
                const caption = item.media?.[0]?.caption || item.caption;
                if (caption) posts.push(caption);
              });
            }
          }
          
          // Facebook Parser
          if (platform === "facebook" && entryName.includes("posts/your_posts") && entryName.endsWith(".json")) {
            const data = JSON.parse(entry.getData().toString("utf8"));
            if (Array.isArray(data)) {
              data.forEach(item => {
                if (item.post) posts.push(item.post);
                else if (item.data?.[0]?.post) posts.push(item.data[0].post);
              });
            }
          }

          // X (Twitter) Parser
          if (platform === "twitter" && entryName.includes("data/tweet") && (entryName.endsWith(".js") || entryName.endsWith(".json"))) {
            let content = entry.getData().toString("utf8");
            if (content.includes("=")) {
              content = content.substring(content.indexOf("=") + 1);
            }
            try {
              const data = JSON.parse(content);
              if (Array.isArray(data)) {
                data.forEach(item => {
                  if (item.tweet?.full_text) posts.push(item.tweet.full_text);
                });
              }
            } catch (e) {
              console.error("Failed to parse Twitter JS/JSON", e);
            }
          }

          // YouTube Parser
          if (platform === "youtube" && entryName.includes("history/watch-history") && entryName.endsWith(".json")) {
            const data = JSON.parse(entry.getData().toString("utf8"));
            if (Array.isArray(data)) {
              data.forEach(item => {
                if (item.title) posts.push(item.title);
              });
            }
          }
        }
      } else if (req.file.mimetype === "application/json" || req.file.originalname.endsWith(".json")) {
        const data = JSON.parse(req.file.buffer.toString("utf8"));
        if (Array.isArray(data)) {
          data.forEach(item => {
            const text = item.text || item.caption || item.post || item.title || item.full_text;
            if (text) posts.push(text);
          });
        }
      }

      const cleanedPosts = Array.from(new Set(posts))
        .map(p => p.trim())
        .filter(p => p.length > 5)
        .slice(0, 50);

      res.json({ 
        success: true, 
        platform, 
        count: cleanedPosts.length,
        posts: cleanedPosts 
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process archive" });
    }
  });

// Single endpoint for upload + analyze (production flow)
  app.post("/api/scan", upload.single("file"), async (req, res) => {
    try {
      console.log('SCAN START - File:', req.file?.originalname);
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const platform = req.body.platform;
      const buffer = req.file.buffer;
      const base64File = buffer.toString('base64');
      const mimeType = req.file.mimetype || 'application/zip';

      console.log('Sending to Gemini: ZIP size', buffer.length);
      
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          text: `Analyze this social media archive (${platform}) for visa risks. Extract posts and identify:
1. Risk level (Low/Medium/High)
2. Score (0-100)
3. Reason
4. Action (Safe/Delete/Archive)

Return JSON array of results. File: ${req.file.originalname}`,
          inlineData: {
            data: base64File,
            mimeType
          }
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                riskLevel: Type.STRING,
                riskScore: Type.NUMBER,
                reason: Type.STRING,
                suggestedAction: Type.STRING
              }
            }
          }
        }
      });

      const results = JSON.parse(response.text || '[]');
      console.log('Gemini SCAN COMPLETE:', results.length, 'results');
      res.json({ success: true, results });
    } catch (error) {
      console.error('SCAN ERROR:', error);
      res.status(500).json({ error: 'AI analysis failed' });
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
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.log(`Port ${PORT} in use - run: npx kill-port ${PORT}`);
    } else {
      console.error('Server error:', err);
    }
  });


startServer();
