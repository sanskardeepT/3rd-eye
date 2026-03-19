import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import AdmZip from "adm-zip";

// ─── CONFIG ─────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "5000");
const MAX_FILE_BYTES = 700 * 1024 * 1024;

// ─── BASIC SERVER ───────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── MULTER (UPLOAD) ────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

// ─── ROOT ROUTE (IMPORTANT FOR RAILWAY) ─────────────

app.get("/", (_req, res) => {
  res.send("Backend is running 🚀");
});

// ─── HEALTH CHECK ───────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ─── SIMPLE ZIP PARSER (SAFE VERSION) ───────────────

app.post(
  "/api/upload",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "File too large (max 700MB)",
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries().map((e) => e.entryName);

      console.log("ZIP entries:", entries.slice(0, 20));

      return res.json({
        success: true,
        message: "ZIP received successfully",
        files: entries.slice(0, 20),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// ─── START SERVER ───────────────────────────────────

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

server.setTimeout(15 * 60 * 1000);
server.keepAliveTimeout = 15 * 60 * 1000;