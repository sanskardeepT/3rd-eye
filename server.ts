import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import AdmZip from "adm-zip";
import path from "path";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "5000");
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const MAX_FILE_BYTES = 700 * 1024 * 1024; // 700MB

let ai: InstanceType<typeof GoogleGenAI> | null = null;
if (GEMINI_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  console.log("✓ Gemini AI ready");
} else {
  console.warn("⚠  No GEMINI_API_KEY in .env");
}

// ─── POST ITEM ────────────────────────────────────────────────────────────────

export interface PostItem {
  category: string;   // "Post" | "Reel" | "Story" | "Comment" | "DM" | "Tweet" | "Reply" | "Like" | "Watch" | "Search" | "Upload"
  text: string;       // main content
  sender?: string;    // who sent (DMs)
  receiver?: string;  // who received (DMs)
  participants?: string[]; // all people in conversation
  username?: string;  // commenter / poster username
  reelOwner?: string; // whose reel was commented on
  postOwner?: string; // whose post was commented on
  timestamp?: string;
  extra?: string;     // any other context
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isMedia(name: string) {
  return /\.(jpg|jpeg|png|gif|mp4|mov|heic|webp|mp3|aac|wav|pdf)$/i.test(name);
}

function safeJson(raw: string): any {
  try {
    let s = raw.trim();
    // Strip JS variable assignment: window.YTD.tweets.part0 = [...]
    if (s.includes("=")) s = s.substring(s.indexOf("=") + 1).trim();
    if (s.endsWith(";")) s = s.slice(0, -1).trim();
    return JSON.parse(s);
  } catch { return null; }
}

function s(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function fmtTs(ts: number | string | undefined): string {
  if (!ts) return "";
  try {
    const n = typeof ts === "string" ? Date.parse(ts) : ts * (ts > 1e10 ? 1 : 1000);
    return new Date(n).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return ""; }
}

// ─── INSTAGRAM PARSER ─────────────────────────────────────────────────────────
//
// Real archive structure (JSON format):
//   your_instagram_activity/
//     content/
//       posts_1.json        [{media:[{title,caption,creation_timestamp,uri}]}]
//       reels.json          [{media:[{title,creation_timestamp}]}]
//       stories.json        {ig_stories:[{title,creation_timestamp,media:[{title}]}]}
//       archived_posts.json {ig_archived_post_media:[{media:[{title}]}]}
//     comments/
//       post_comments_1.json  {comments_media_comments:[{string_list_data:[{value,timestamp}]}]}
//       reels_comments.json   {comments_reels_comments:[{string_list_data:[{value,timestamp}],title}]}
//     messages/
//       inbox/
//         username_abc123/
//           message_1.json  {participants:[{name}],messages:[{sender_name,content,timestamp_ms}]}
//     saved/
//       saved_posts.json

function parseInstagram(zip: AdmZip): PostItem[] {
  const items: PostItem[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase().replace(/\\/g, "/");
    if (isMedia(name) || !name.endsWith(".json")) continue;

    let raw: string;
    try { raw = entry.getData().toString("utf8"); } catch { continue; }
    const data = safeJson(raw);
    if (!data) continue;

    // ── POSTS ─────────────────────────────────────────────────────────────────
    // Matches: content/posts_1.json, content/posts_2.json, posts_1.json
    if (
      /content\/posts_?\d*\.json/.test(name) ||
      /\/posts_\d+\.json$/.test(name) ||
      name === "posts_1.json"
    ) {
      const arr = Array.isArray(data) ? data : [];
      for (const item of arr) {
        const mediaArr = Array.isArray(item?.media) ? item.media : [item];
        for (const m of mediaArr) {
          const text = s(m?.title) || s(m?.caption) || s(item?.title);
          if (text.length < 2) continue;
          items.push({
            category: "Post",
            text,
            timestamp: fmtTs(m?.creation_timestamp || item?.creation_timestamp),
          });
        }
      }
    }

    // ── REELS ─────────────────────────────────────────────────────────────────
    if (name.includes("reel") && !name.includes("comment")) {
      const arr = Array.isArray(data) ? data : [];
      for (const item of arr) {
        const mediaArr = Array.isArray(item?.media) ? item.media : [item];
        for (const m of mediaArr) {
          const text = s(m?.title) || s(m?.caption) || s(item?.title);
          if (text.length < 2) continue;
          items.push({
            category: "Reel",
            text,
            timestamp: fmtTs(m?.creation_timestamp),
          });
        }
      }
    }

    // ── STORIES ───────────────────────────────────────────────────────────────
    if (name.includes("stori") && !name.includes("comment")) {
      const stories = Array.isArray(data?.ig_stories) ? data.ig_stories : (Array.isArray(data) ? data : []);
      for (const story of stories) {
        const mediaArr = Array.isArray(story?.media) ? story.media : [story];
        for (const m of mediaArr) {
          const text = s(m?.title) || s(story?.title);
          if (text.length < 2) continue;
          items.push({
            category: "Story",
            text,
            timestamp: fmtTs(m?.creation_timestamp || story?.creation_timestamp),
          });
        }
      }
    }

    // ── ARCHIVED POSTS ────────────────────────────────────────────────────────
    if (name.includes("archived")) {
      const arr = data?.ig_archived_post_media || (Array.isArray(data) ? data : []);
      for (const item of arr) {
        const mediaArr = Array.isArray(item?.media) ? item.media : [item];
        for (const m of mediaArr) {
          const text = s(m?.title) || s(item?.title);
          if (text.length < 2) continue;
          items.push({
            category: "Post",
            text,
            extra: "Archived",
            timestamp: fmtTs(m?.creation_timestamp),
          });
        }
      }
    }

    // ── COMMENTS ON POSTS ─────────────────────────────────────────────────────
    // post_comments_1.json → {comments_media_comments:[{string_list_data:[{value,timestamp,href}],title}]}
    if (name.includes("post_comment") || name.includes("comments/post")) {
      const list: any[] = data?.comments_media_comments || (Array.isArray(data) ? data : []);
      for (const c of list) {
        if (Array.isArray(c?.string_list_data)) {
          for (const e of c.string_list_data) {
            const text = s(e?.value);
            if (text.length < 2) continue;
            items.push({
              category: "Comment",
              text,
              postOwner: s(c?.title).replace("Media owner: ", "").trim() || "",
              timestamp: fmtTs(e?.timestamp),
              extra: "Comment on Post",
            });
          }
        } else if (c?.string_map_data) {
          const text = s(c.string_map_data?.Comment?.value);
          if (text.length >= 2)
            items.push({ category: "Comment", text, extra: "Comment on Post" });
        }
      }
    }

    // ── COMMENTS ON REELS ────────────────────────────────────────────────────
    // reels_comments.json → {comments_reels_comments:[{string_list_data:[{value,timestamp}],title}]}
    if (name.includes("reel") && name.includes("comment")) {
      const list: any[] = data?.comments_reels_comments || (Array.isArray(data) ? data : []);
      for (const c of list) {
        if (Array.isArray(c?.string_list_data)) {
          for (const e of c.string_list_data) {
            const text = s(e?.value);
            if (text.length < 2) continue;
            items.push({
              category: "Comment",
              text,
              reelOwner: s(c?.title).replace("Media owner: ", "").trim() || "",
              timestamp: fmtTs(e?.timestamp),
              extra: "Comment on Reel",
            });
          }
        }
      }
    }

    // ── GENERIC COMMENTS (any other comment file) ─────────────────────────────
    if (name.includes("comment") && !name.includes("post_comment") && !name.includes("reel")) {
      const list: any[] =
        data?.comments_media_comments ||
        data?.comments_reels_comments ||
        data?.post_comments ||
        (Array.isArray(data) ? data : []);
      for (const c of list) {
        if (Array.isArray(c?.string_list_data)) {
          for (const e of c.string_list_data) {
            const text = s(e?.value);
            if (text.length >= 2)
              items.push({ category: "Comment", text, timestamp: fmtTs(e?.timestamp) });
          }
        }
      }
    }

    // ── DIRECT MESSAGES ───────────────────────────────────────────────────────
    // messages/inbox/<username_hash>/message_1.json
    // {participants:[{name}], messages:[{sender_name,content,timestamp_ms,type}]}
    if (name.includes("message_") && name.includes("inbox")) {
      const participants: string[] = (data?.participants || [])
        .map((p: any) => s(p?.name)).filter(Boolean);
      const msgs: any[] = Array.isArray(data?.messages) ? data.messages : [];
      for (const msg of msgs) {
        const text = s(msg?.content);
        if (text.length < 2) continue;
        const sender = s(msg?.sender_name);
        const receivers = participants.filter(n => n !== sender);
        items.push({
          category: "DM",
          text,
          sender,
          receiver: receivers.join(", "),
          participants,
          timestamp: fmtTs(msg?.timestamp_ms),
        });
      }
    }
  }

  return items;
}

// ─── FACEBOOK PARSER ──────────────────────────────────────────────────────────
//
//   your_facebook_activity/
//     posts/your_posts_1.json  [{post, timestamp, data:[{post}]}]
//     comments_and_reactions/
//       comments.json  {comments_v2:[{data:[{comment:{comment,author}}],timestamp,title}]}
//     messages/inbox/<name>/message_1.json
//       {participants:[{name}], messages:[{sender_name,content,timestamp_ms,type}]}
//     groups/your_posts_and_comments_in_groups.json [{post,title,timestamp}]

function parseFacebook(zip: AdmZip): PostItem[] {
  const items: PostItem[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase().replace(/\\/g, "/");
    if (isMedia(name) || !name.endsWith(".json")) continue;

    let raw: string;
    try { raw = entry.getData().toString("utf8"); } catch { continue; }
    const data = safeJson(raw);
    if (!data) continue;

    // POSTS
    if (name.includes("your_posts") && !name.includes("group")) {
      const arr = Array.isArray(data) ? data : [];
      for (const item of arr) {
        const text = s(item?.post) || s(item?.data?.[0]?.post) || s(item?.title);
        if (text.length < 2) continue;
        items.push({ category: "Post", text, timestamp: fmtTs(item?.timestamp) });
      }
    }

    // COMMENTS
    if (name.includes("comment") && !name.includes("message")) {
      const list: any[] = data?.comments_v2 || data?.comments || (Array.isArray(data) ? data : []);
      for (const c of list) {
        const dataArr = Array.isArray(c?.data) ? c.data : [];
        for (const d of dataArr) {
          const text = s(d?.comment?.comment) || s(d?.post);
          if (text.length < 2) continue;
          items.push({
            category: "Comment",
            text,
            username: s(d?.comment?.author),
            extra: s(c?.title),
            timestamp: fmtTs(c?.timestamp),
          });
        }
        // Flat format
        if (dataArr.length === 0) {
          const text = s(c?.comment?.comment) || s(c?.comment);
          if (text.length >= 2) items.push({ category: "Comment", text });
        }
      }
    }

    // DMs (Messenger)
    if (name.includes("messages/inbox") && name.includes("message_")) {
      const participants: string[] = (data?.participants || [])
        .map((p: any) => s(p?.name)).filter(Boolean);
      const msgs: any[] = Array.isArray(data?.messages) ? data.messages : [];
      for (const msg of msgs) {
        const text = s(msg?.content);
        if (text.length < 2 || msg?.type === "Share") continue;
        const sender = s(msg?.sender_name);
        const receivers = participants.filter(n => n !== sender);
        items.push({
          category: "DM",
          text,
          sender,
          receiver: receivers.join(", "),
          participants,
          timestamp: fmtTs(msg?.timestamp_ms),
        });
      }
    }

    // GROUP POSTS
    if (name.includes("group")) {
      const arr = Array.isArray(data) ? data : (data?.group_posts || []);
      for (const item of arr) {
        const text = s(item?.post) || s(item?.data?.[0]?.post) || s(item?.title);
        if (text.length >= 2)
          items.push({ category: "Post", text, extra: `Group: ${s(item?.title)}`, timestamp: fmtTs(item?.timestamp) });
      }
    }

    // STORIES
    if (name.includes("story") && !name.includes("message")) {
      const arr = data?.story_activities_story_likes || data?.story_activities || (Array.isArray(data) ? data : []);
      for (const item of arr) {
        const text = s(item?.title) || s(item?.post);
        if (text.length >= 2) items.push({ category: "Story", text });
      }
    }
  }

  return items;
}

// ─── TWITTER PARSER ───────────────────────────────────────────────────────────
//
//   data/tweets.js          [{tweet:{full_text,created_at,in_reply_to_screen_name,favorite_count,retweet_count}}]
//   data/like.js            [{like:{fullText,tweetUrl,expandedUrl}}]
//   data/direct-messages.js [{dmConversation:{conversationId,messages:[{messageCreate:{text,senderId,recipientId,createdAt}}]}}]
//   data/note-tweet.js      [{noteTweet:{core:{text}}}]

function parseTwitter(zip: AdmZip): PostItem[] {
  const items: PostItem[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase().replace(/\\/g, "/");
    if (isMedia(name)) continue;
    if (!name.endsWith(".js") && !name.endsWith(".json")) continue;

    let raw: string;
    try { raw = entry.getData().toString("utf8").trim(); } catch { continue; }
    const data = safeJson(raw);
    if (!Array.isArray(data)) continue;

    // TWEETS + REPLIES
    if (name.includes("tweet") && !name.includes("like") && !name.includes("dm") && !name.includes("note")) {
      for (const item of data) {
        const t = item?.tweet || item;
        const text = s(t?.full_text) || s(t?.text);
        if (text.length < 2) continue;
        const ts = fmtTs(t?.created_at);
        const replyTo = s(t?.in_reply_to_screen_name);
        if (text.startsWith("RT @")) {
          items.push({ category: "Like", text, extra: "Retweet", timestamp: ts });
        } else if (replyTo) {
          items.push({ category: "Reply", text, receiver: `@${replyTo}`, timestamp: ts });
        } else {
          items.push({ category: "Post", text, timestamp: ts });
        }
      }
    }

    // LIKES
    if (name.endsWith("like.js") || name.endsWith("like.json") || name.includes("/like.")) {
      for (const item of data) {
        const l = item?.like || item;
        const text = s(l?.fullText);
        if (text.length >= 2)
          items.push({ category: "Like", text, extra: s(l?.tweetUrl) });
      }
    }

    // DMs
    if (name.includes("direct-message") || name.includes("direct_message")) {
      for (const item of data) {
        const convo = item?.dmConversation || item;
        const convoId = s(convo?.conversationId);
        const msgs: any[] = Array.isArray(convo?.messages) ? convo.messages : [];
        for (const msg of msgs) {
          const mc = msg?.messageCreate || msg;
          const text = s(mc?.text);
          if (text.length < 2) continue;
          items.push({
            category: "DM",
            text,
            sender: `User ${s(mc?.senderId)}`,
            receiver: `User ${s(mc?.recipientId)}`,
            extra: `Conversation: ${convoId}`,
            timestamp: fmtTs(mc?.createdAt),
          });
        }
      }
    }

    // NOTE TWEETS
    if (name.includes("note")) {
      for (const item of data) {
        const text = s(item?.noteTweet?.core?.text) || s(item?.core?.text);
        if (text.length >= 2) items.push({ category: "Post", text, extra: "Note Tweet" });
      }
    }
  }

  return items;
}

// ─── YOUTUBE PARSER ───────────────────────────────────────────────────────────
//
//   Takeout/YouTube and YouTube Music/
//     history/
//       watch-history.json  [{title,titleUrl,subtitles:[{name,url}],time}]
//       watch-history.html  older format
//       search-history.json [{title:"Searched for X",time}]
//     comments/comments.json [{snippet:{videoId,textOriginal,publishedAt,authorDisplayName}}]
//     videos/<id>.info.json  {title,description,tags}
//     playlists/likes.json   {items:[{snippet:{title}}]}
//     subscriptions/subscriptions.json [{snippet:{title}}]

function parseYouTube(zip: AdmZip): PostItem[] {
  const items: PostItem[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase().replace(/\\/g, "/");
    if (isMedia(name)) continue;
    if (!name.endsWith(".json") && !name.endsWith(".html")) continue;

    let raw: string;
    try { raw = entry.getData().toString("utf8"); } catch { continue; }

    // WATCH HISTORY JSON
    if ((name.includes("watch-history") || name.includes("watch_history")) && name.endsWith(".json")) {
      const data = safeJson(raw);
      for (const item of (Array.isArray(data) ? data : [])) {
        const title = s(item?.title).replace(/^Watched\s+/i, "");
        if (title.length < 3) continue;
        const channel = s(item?.subtitles?.[0]?.name);
        items.push({
          category: "Watch",
          text: title,
          username: channel || "",
          timestamp: fmtTs(item?.time),
          extra: channel ? `Channel: ${channel}` : "",
        });
      }
    }

    // WATCH HISTORY HTML
    if ((name.includes("watch-history") || name.includes("watch_history")) && name.endsWith(".html")) {
      const matches = [...raw.matchAll(/<a href="https:\/\/www\.youtube\.com\/watch[^"]*">([^<]+)<\/a>/gi)];
      for (const m of matches) {
        const title = m[1]?.trim();
        if (title && title.length > 2) items.push({ category: "Watch", text: title });
      }
    }

    // SEARCH HISTORY JSON
    if ((name.includes("search-history") || name.includes("search_history")) && name.endsWith(".json")) {
      const data = safeJson(raw);
      for (const item of (Array.isArray(data) ? data : [])) {
        const query = s(item?.title).replace(/^Searched for\s+/i, "");
        if (query.length >= 2)
          items.push({ category: "Search", text: query, timestamp: fmtTs(item?.time) });
      }
    }

    // SEARCH HISTORY HTML
    if ((name.includes("search-history") || name.includes("search_history")) && name.endsWith(".html")) {
      const matches = [...raw.matchAll(/Searched for <a[^>]*>([^<]+)<\/a>/gi)];
      for (const m of matches) {
        const q = m[1]?.trim();
        if (q) items.push({ category: "Search", text: q });
      }
    }

    // COMMENTS ON VIDEOS
    if (name.includes("comment") && name.endsWith(".json")) {
      const data = safeJson(raw);
      for (const item of (Array.isArray(data) ? data : [])) {
        const text = s(item?.snippet?.textOriginal) || s(item?.textOriginal) || s(item?.text);
        if (text.length < 2) continue;
        items.push({
          category: "Comment",
          text,
          username: s(item?.snippet?.authorDisplayName),
          extra: `Video: ${s(item?.snippet?.videoId) || s(item?.videoId)}`,
          timestamp: fmtTs(item?.snippet?.publishedAt),
        });
      }
    }

    // UPLOADED VIDEOS
    if (name.includes("videos/") && name.endsWith(".json")) {
      const data = safeJson(raw);
      if (!data) continue;
      const title = s(data?.title);
      const desc = s(data?.description);
      const tags = Array.isArray(data?.tags) ? data.tags.join(", ") : "";
      if (title.length > 2) items.push({ category: "Upload", text: title, extra: desc.slice(0, 200) });
      if (tags) items.push({ category: "Upload", text: `Tags: ${tags}`, extra: title });
    }

    // LIKED VIDEOS (playlist)
    if (name.includes("playlist") && name.endsWith(".json")) {
      const data = safeJson(raw);
      const isLikes = name.includes("like");
      for (const item of (data?.items || [])) {
        const title = s(item?.snippet?.title);
        if (title.length > 2)
          items.push({ category: "Like", text: title, extra: isLikes ? "Liked video" : "Playlist" });
      }
    }

    // SUBSCRIPTIONS
    if (name.includes("subscription") && name.endsWith(".json")) {
      const data = safeJson(raw);
      for (const item of (Array.isArray(data) ? data : [])) {
        const title = s(item?.snippet?.title);
        if (title.length > 2) items.push({ category: "Watch", text: title, extra: "Subscribed channel" });
      }
    }
  }

  return items;
}

// ─── DEDUP ────────────────────────────────────────────────────────────────────

function dedup(items: PostItem[]): PostItem[] {
  const seen = new Set<string>();
  const result: PostItem[] = [];
  for (const item of items) {
    if ((item.text || "").trim().length < 2) continue;
    const key = (item.category + "|" + item.text).toLowerCase().slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result; // NO LIMIT — return all
}

// ─── GEMINI ───────────────────────────────────────────────────────────────────

interface AnalysisResult extends PostItem {
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
  reason: string;
  suggestedAction: "Safe" | "Archive" | "Delete";
}

async function analyzePost(item: PostItem): Promise<AnalysisResult> {
  const base = { ...item };

  const safe = (reason: string): AnalysisResult => ({
    ...base, riskLevel: "Low", riskScore: 0, reason, suggestedAction: "Safe",
  });
  const high = (reason: string): AnalysisResult => ({
    ...base, riskLevel: "High", riskScore: 85, reason, suggestedAction: "Delete",
  });

  if (!ai) return safe("AI not configured. Add GEMINI_API_KEY to .env");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `You are a social media risk analyst for visa, university, employment background checks.

Type: ${item.category}
${item.extra ? `Context: ${item.extra}` : ""}
${item.sender ? `Sender: ${item.sender}` : ""}
Content: "${(item.text || "").slice(0, 1500)}"

Flag ONLY genuinely problematic content: hate speech, extremism, illegal activity, threats, explicit content, visa violation intent.
Normal everyday content = Low risk (0-15 score).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            riskScore: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
          },
          required: ["riskLevel", "riskScore", "reason", "suggestedAction"],
        },
      },
    });

    const r = JSON.parse(response.text || "{}");
    return {
      ...base,
      riskLevel: (["Low","Medium","High"].includes(r.riskLevel) ? r.riskLevel : "Low") as AnalysisResult["riskLevel"],
      riskScore: Math.min(100, Math.max(0, Math.round(Number(r.riskScore) || 0))),
      reason: s(r.reason).slice(0, 400) || "No issue found.",
      suggestedAction: (["Safe","Archive","Delete"].includes(r.suggestedAction) ? r.suggestedAction : "Safe") as AnalysisResult["suggestedAction"],
    };
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("safety") || msg.includes("block")) return high("Flagged by safety filter — review manually.");
    if (msg.includes("quota") || msg.includes("429")) throw new Error("RATE_LIMIT");
    return safe("Analysis error.");
  }
}

// ─── SERVER ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter: (_req, file, cb) => {
      const ok = file.mimetype.includes("zip") ||
        file.mimetype === "application/octet-stream" ||
        file.originalname.toLowerCase().endsWith(".zip");
      cb(null, ok);
    },
  });

  app.use(express.json({ limit: "2mb" }));
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true, aiEnabled: Boolean(ai) }));

  // ── UPLOAD ────────────────────────────────────────────────────────────────

  app.post("/api/upload",
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err: any) => {
        if (!err) return next();
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(413).json({ success: false, error: "File too large. Max 700MB." });
        return res.status(400).json({ success: false, error: err.message || "Upload failed." });
      });
    },
    async (req: Request, res: Response) => {
      try {
        if (!req.file) { res.status(400).json({ success: false, error: "No file received." }); return; }

        const platform = s(req.body.platform).toLowerCase();
        if (!["instagram","facebook","twitter","youtube"].includes(platform)) {
          res.status(400).json({ success: false, error: "Invalid platform." }); return;
        }

        let zip: AdmZip;
        try { zip = new AdmZip(req.file.buffer); }
        catch { res.status(400).json({ success: false, error: "Cannot open ZIP. Is it corrupted?" }); return; }

        const allEntries = zip.getEntries().map(e => e.entryName);
        console.log(`\n[${platform.toUpperCase()}] ZIP: ${allEntries.length} entries`);
        console.log("First 30:", allEntries.slice(0, 30).join("\n  "));

        let raw: PostItem[] = [];
        if (platform === "instagram") raw = parseInstagram(zip);
        else if (platform === "facebook") raw = parseFacebook(zip);
        else if (platform === "twitter") raw = parseTwitter(zip);
        else raw = parseYouTube(zip);

        const finalItems = dedup(raw); // NO LIMIT

        // Count by category
        const counts: Record<string, number> = {};
        for (const i of finalItems) counts[i.category] = (counts[i.category] || 0) + 1;
        console.log(`[${platform.toUpperCase()}] Total: ${finalItems.length}`, counts);

        if (finalItems.length === 0) {
          res.json({
            success: false,
            error:
              `No content found.\n\nMake sure:\n` +
              `• Instagram/Facebook: JSON format selected (not HTML)\n` +
              `• Twitter: archive has data/*.js files\n` +
              `• YouTube: "YouTube and YouTube Music" selected in Takeout\n\n` +
              `ZIP contains:\n${allEntries.slice(0, 20).join("\n")}`,
            items: [],
            counts: {},
          });
          return;
        }

        res.json({ success: true, platform, items: finalItems, counts });
      } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, error: "Server error." });
      }
    }
  );

  // ── ANALYZE SINGLE POST ───────────────────────────────────────────────────

  app.post("/api/analyze-post", async (req: Request, res: Response) => {
    const { item } = req.body;
    if (!item?.text) { res.status(400).json({ error: "item.text required." }); return; }
    try {
      const result = await analyzePost(item as PostItem);
      res.json(result);
    } catch (err: any) {
      if (err?.message === "RATE_LIMIT") { res.status(429).json({ error: "Rate limited." }); return; }
      res.status(500).json({ error: "Analysis failed." });
    }
  });

  // ── VITE / STATIC ─────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✓ http://localhost:${PORT}`);
    console.log(`✓ AI: ${ai ? "Gemini ON" : "OFF — add GEMINI_API_KEY to .env"}\n`);
  });

  server.setTimeout(15 * 60 * 1000);
  server.keepAliveTimeout = 15 * 60 * 1000;

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") console.error(`Port ${PORT} in use. Run: npx kill-port ${PORT}`);
    else console.error("Server error:", err);
    process.exit(1);
  });
}

startServer().catch(console.error);
