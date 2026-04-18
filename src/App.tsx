import React, { useState, useCallback, useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, CheckCircle, ArrowLeft, ChevronRight,
  Upload, Loader, Info, X, Trash2, Archive,
  Instagram, Facebook, Twitter, Youtube, FileWarning,
  MessageSquare, Heart, Film, Eye, Hash, Radio, ThumbsUp,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PostItem {
  category: string;
  text: string;
  sender?: string;
  receiver?: string;
  participants?: string[];
  username?: string;
  reelOwner?: string;
  postOwner?: string;
  timestamp?: string;
  extra?: string;
}

interface AnalysisResult extends PostItem {
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
  reason: string;
  suggestedAction: "Safe" | "Archive" | "Delete";
}

type Platform = "instagram" | "facebook" | "twitter" | "youtube";
type Page = "home" | "platform" | "upload" | "analyzing" | "dashboard";

// ─── PLATFORM TAB CONFIG ──────────────────────────────────────────────────────

interface TabConfig {
  id: string;
  label: string;
  categories: string[];
  icon: ReactNode;
  description: string;
}

const PLATFORM_TABS: Record<Platform, TabConfig[]> = {
  instagram: [
    { id: "all",      label: "All",      categories: [],                              icon: <Search className="w-4 h-4" />,      description: "Everything" },
    { id: "post",     label: "Posts",    categories: ["Post"],                        icon: <Film className="w-4 h-4" />,        description: "Your posts & captions" },
    { id: "reel",     label: "Reels",    categories: ["Reel"],                        icon: <Radio className="w-4 h-4" />,       description: "Reel captions" },
    { id: "story",    label: "Stories",  categories: ["Story"],                       icon: <Eye className="w-4 h-4" />,         description: "Story text" },
    { id: "comment",  label: "Comments", categories: ["Comment"],                     icon: <MessageSquare className="w-4 h-4" />,description: "Comments on posts & reels" },
    { id: "dm",       label: "DMs",      categories: ["DM"],                          icon: <MessageSquare className="w-4 h-4" />,description: "Direct messages" },
  ],
  facebook: [
    { id: "all",      label: "All",      categories: [],                              icon: <Search className="w-4 h-4" />,      description: "Everything" },
    { id: "post",     label: "Posts",    categories: ["Post"],                        icon: <Film className="w-4 h-4" />,        description: "Timeline & group posts" },
    { id: "comment",  label: "Comments", categories: ["Comment"],                     icon: <MessageSquare className="w-4 h-4" />,description: "Comments on posts" },
    { id: "dm",       label: "Messenger",categories: ["DM"],                          icon: <MessageSquare className="w-4 h-4" />,description: "Messenger conversations" },
    { id: "story",    label: "Stories",  categories: ["Story"],                       icon: <Eye className="w-4 h-4" />,         description: "Story activity" },
  ],
  twitter: [
    { id: "all",      label: "All",      categories: [],                              icon: <Search className="w-4 h-4" />,      description: "Everything" },
    { id: "post",     label: "Tweets",   categories: ["Post"],                        icon: <Hash className="w-4 h-4" />,        description: "Your tweets" },
    { id: "reply",    label: "Replies",  categories: ["Reply"],                       icon: <MessageSquare className="w-4 h-4" />,description: "Replies to others" },
    { id: "like",     label: "Liked",    categories: ["Like"],                        icon: <Heart className="w-4 h-4" />,       description: "Liked & retweeted" },
    { id: "dm",       label: "DMs",      categories: ["DM"],                          icon: <MessageSquare className="w-4 h-4" />,description: "Direct messages" },
  ],
  youtube: [
    { id: "all",      label: "All",      categories: [],                              icon: <Search className="w-4 h-4" />,      description: "Everything" },
    { id: "watch",    label: "Watched",  categories: ["Watch"],                       icon: <Eye className="w-4 h-4" />,         description: "Watch history" },
    { id: "search",   label: "Searches", categories: ["Search"],                      icon: <Search className="w-4 h-4" />,      description: "Search history" },
    { id: "comment",  label: "Comments", categories: ["Comment"],                     icon: <MessageSquare className="w-4 h-4" />,description: "Comments on videos" },
    { id: "upload",   label: "Uploads",  categories: ["Upload"],                      icon: <Film className="w-4 h-4" />,        description: "Your uploaded videos" },
    { id: "like",     label: "Liked",    categories: ["Like"],                        icon: <ThumbsUp className="w-4 h-4" />,    description: "Liked & playlist videos" },
  ],
};

// ─── PLATFORM CONFIG ──────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "instagram" as Platform, label: "Instagram",
    Icon: Instagram, iconClass: "text-pink-500",
    hoverBorder: "hover:border-pink-500/50", hoverBg: "hover:bg-pink-500/5",
    format: "JSON format required",
    steps: [
      "Instagram → Profile → Menu (☰) → Settings and Privacy",
      "Accounts Center → Your information and permissions",
      "Download your information → Request a download",
      "Complete copy → ⚠️ Select JSON format (NOT HTML)",
      "Submit → Wait for email (can take hours)",
      "Download the ZIP file",
    ],
    dataIncluded: ["Posts & captions", "Reels", "Stories", "Comments on posts & reels", "Direct messages", "Archived posts"],
  },
  {
    id: "facebook" as Platform, label: "Facebook",
    Icon: Facebook, iconClass: "text-blue-500",
    hoverBorder: "hover:border-blue-500/50", hoverBg: "hover:bg-blue-500/5",
    format: "JSON format required",
    steps: [
      "Facebook → Menu → Settings & Privacy → Settings",
      "Accounts Center → Your information and permissions",
      "Download your information → Select Facebook account",
      "Complete copy → ⚠️ JSON format",
      "Submit → Wait for email",
      "Download ZIP",
    ],
    dataIncluded: ["Timeline posts", "Comments", "Messenger DMs", "Group posts", "Stories"],
  },
  {
    id: "twitter" as Platform, label: "X (Twitter)",
    Icon: Twitter, iconClass: "text-zinc-400",
    hoverBorder: "hover:border-zinc-500/50", hoverBg: "hover:bg-zinc-500/5",
    format: "Auto-detected (.js files)",
    steps: [
      "X → Settings → Your Account",
      "Download an archive of your data",
      "Verify identity (password / 2FA)",
      "Request archive",
      "Wait for email (up to 24 hours)",
      "Download ZIP",
    ],
    dataIncluded: ["Tweets", "Replies", "Liked & retweeted", "Direct messages"],
  },
  {
    id: "youtube" as Platform, label: "YouTube",
    Icon: Youtube, iconClass: "text-red-500",
    hoverBorder: "hover:border-red-500/50", hoverBg: "hover:bg-red-500/5",
    format: "HTML or JSON (both work)",
    steps: [
      "Go to takeout.google.com",
      "Click Deselect All",
      "Select YouTube and YouTube Music only",
      "Multiple formats → set History to JSON",
      "Next → Create export",
      "Download ZIP from email",
    ],
    dataIncluded: ["Watch history + channel", "Search history", "Comments on videos", "Uploaded videos", "Liked videos"],
  },
];

// ─── EYE LOGO ─────────────────────────────────────────────────────────────────

function EyeLogo({ className = "w-64 h-64" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        <defs>
          <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <radialGradient id="rg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2 }}
          d="M40 200 C40 200 120 80 200 80 C280 80 360 200 360 200 C360 200 280 320 200 320 C120 320 40 200 40 200Z"
          stroke="url(#eg)" strokeWidth="12" strokeLinecap="round" filter="url(#glow)" />
        <g transform="translate(200,200)">
          <circle r="70" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.3" />
          <circle r="45" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.5" />
          <motion.path animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            d="M0 0 L0 -70 A70 70 0 0 1 60.6 -35 Z" fill="url(#rg)" style={{ transformOrigin: "center" }} />
          <motion.line x1="0" y1="0" x2="0" y2="-70" stroke="#60A5FA" strokeWidth="2"
            animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "center" }} />
          <circle r="8" fill="white" filter="url(#glow)">
            <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  );
}

// ─── DOWNLOAD GUIDE ───────────────────────────────────────────────────────────

function DownloadGuide({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const p = PLATFORMS.find(x => x.id === platform)!;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
      <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/5"><p.Icon className={`w-6 h-6 ${p.iconClass}`} /></div>
          <div>
            <h3 className="font-bold text-xl">Download your {p.label} data</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{p.format}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>
      <div className="overflow-y-auto p-8 space-y-8">
        <section>
          <h4 className="font-bold mb-4 text-zinc-400 text-xs uppercase tracking-widest">Steps</h4>
          <div className="space-y-3">
            {p.steps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-t border-white/5 pt-8">
          <h4 className="font-bold mb-4 text-zinc-400 text-xs uppercase tracking-widest">What gets scanned</h4>
          <ul className="grid grid-cols-2 gap-2">
            {p.dataIncluded.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />{item}
              </li>
            ))}
          </ul>
        </section>
        <div className="flex justify-end pt-4 border-t border-white/5">
          <button type="button" onClick={onClose}
            className="px-8 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-all">
            Ready to upload
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── XHR UPLOAD ───────────────────────────────────────────────────────────────

async function uploadXHR(
  file: File, platform: Platform,
  onProgress: (pct: number) => void,
  attempt = 1,
): Promise<any> {
  const apiTargets = [
    `${window.location.origin}/api/upload`,
    "http://localhost:5000/api/upload",
  ].filter((url, index, arr) => arr.indexOf(url) === index);

  const tryTarget = (targetIndex: number): Promise<any> => new Promise((resolve) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("platform", platform);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      try { resolve(JSON.parse(xhr.responseText)); }
      catch { resolve({ success: false, error: "Invalid server response." }); }
    };
    xhr.onerror = async () => {
      if (targetIndex < apiTargets.length - 1) {
        resolve(tryTarget(targetIndex + 1));
      } else if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        resolve(uploadXHR(file, platform, onProgress, attempt + 1));
      } else {
        resolve({ success: false, error: "Upload server se connection nahi ho raha. Ensure backend is running on localhost:5000 and try again." });
      }
    };
    xhr.ontimeout = () => resolve({ success: false, error: "Upload timed out." });
    xhr.timeout = 15 * 60 * 1000;
    xhr.open("POST", apiTargets[targetIndex]);
    xhr.send(fd);
  });
  return tryTarget(0);
}

function verdictFromScore(score: number) {
  if (score >= 75) return { label: "Safe", tone: "text-emerald-400", chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" };
  if (score >= 45) return { label: "Moderate", tone: "text-amber-400", chip: "bg-amber-500/15 border-amber-500/30 text-amber-300" };
  return { label: "Risky", tone: "text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-300" };
}

function itemSafetyMeta(item: AnalysisResult) {
  const safetyPercent = Math.max(0, Math.min(100, 100 - item.riskScore));
  if (item.riskLevel === "High") return { label: "Risky", safetyPercent };
  if (item.riskLevel === "Medium") return { label: "Moderate", safetyPercent };
  return { label: "Safe", safetyPercent };
}

// ─── CONTENT CARD ─────────────────────────────────────────────────────────────

function ContentCard({ item, index }: { key?: React.Key; item: AnalysisResult; index: number }) {
  const isHigh = item.riskLevel === "High";
  const isMed  = item.riskLevel === "Medium";
  const flagged = isHigh || isMed;
  const safety = itemSafetyMeta(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className={`p-5 rounded-2xl border ${
        isHigh          ? "bg-red-500/5 border-red-500/20"
        : isMed           ? "bg-amber-500/5 border-amber-500/20"
        : "bg-zinc-900/40 border-white/5"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {flagged && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase ${
              isHigh ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
              {safety.label} · {safety.safetyPercent}% safe
            </span>
          )}
          {flagged && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              item.suggestedAction === "Delete"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
              → {item.suggestedAction}
            </span>
          )}
          {!flagged && (
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
              ✓ Safe · {safety.safetyPercent}% safe
            </span>
          )}
        </div>
        {flagged && (
          <div className="flex gap-1.5 shrink-0">
            <button type="button" title="Delete" className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all text-zinc-500">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" title="Archive" className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 transition-all text-zinc-500">
              <Archive className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* DM — show sender/receiver prominently */}
      {item.category === "DM" && (item.sender || item.receiver) && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-white/5">
          <div className="text-sm">
            <span className="font-bold text-white">{item.sender || "?"}</span>
            <span className="text-zinc-500 mx-2">→</span>
            <span className="font-bold text-white">{item.receiver || "?"}</span>
          </div>
          {item.timestamp && <span className="text-xs text-zinc-500 ml-auto shrink-0">{item.timestamp}</span>}
        </div>
      )}

      {/* Comment — show who/where */}
      {item.category === "Comment" && (item.reelOwner || item.postOwner || item.extra) && (
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          {item.extra === "Comment on Reel" && item.reelOwner
            ? <span>On reel by <span className="text-zinc-300 font-medium">@{item.reelOwner}</span></span>
            : item.extra === "Comment on Post" && item.postOwner
            ? <span>On post by <span className="text-zinc-300 font-medium">@{item.postOwner}</span></span>
            : <span>{item.extra}</span>
          }
          {item.timestamp && <span className="ml-auto shrink-0">{item.timestamp}</span>}
        </div>
      )}

      {/* Watch — show channel */}
      {item.category === "Watch" && item.username && (
        <div className="mb-3 text-xs text-zinc-500 flex items-center gap-1.5">
          <Youtube className="w-3.5 h-3.5 shrink-0" />
          Channel: <span className="text-zinc-300 font-medium">{item.username}</span>
          {item.timestamp && <span className="ml-auto shrink-0">{item.timestamp}</span>}
        </div>
      )}

      {/* Reply — show who it's to */}
      {item.category === "Reply" && item.receiver && (
        <div className="mb-3 text-xs text-zinc-500 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Reply to <span className="text-zinc-300 font-medium">{item.receiver}</span>
          {item.timestamp && <span className="ml-auto shrink-0">{item.timestamp}</span>}
        </div>
      )}

      {/* Main text */}
      <p className={`text-sm leading-relaxed border-l-2 pl-4 ${
        flagged ? "text-zinc-200 border-zinc-600" : "text-zinc-400 border-zinc-800"
      }`}>
        {item.text.length > 400 ? item.text.slice(0, 400) + "…" : item.text}
      </p>

      {/* Timestamp (if not shown above) */}
      {item.category !== "DM" && item.category !== "Comment" && item.category !== "Watch" && item.category !== "Reply" && item.timestamp && (
        <p className="text-xs text-zinc-600 mt-2">{item.timestamp}</p>
      )}

      {/* AI reason (deep scan flagged only) */}
      {flagged && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-zinc-400"><span className="font-bold text-zinc-300">AI reason:</span> {item.reason}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

function App() {
  const [page, setPage]           = useState<Page>("home");
  const [platform, setPlatform]   = useState<Platform | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Data
  const [allItems, setAllItems]   = useState<PostItem[]>([]);
  const [results, setResults]     = useState<AnalysisResult[]>([]);
  const [counts, setCounts]       = useState<Record<string, number>>({});
  const [progress, setProgress]   = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [liveItems, setLiveItems] = useState<PostItem[]>([]);

  // UI state
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [statusMsg, setStatusMsg]     = useState("");
  const [activeTab, setActiveTab]     = useState("all");
  const [riskFilter, setRiskFilter]   = useState("all");
  const [page2, setPage2]             = useState(1);
  const PER_PAGE = 20;

  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeItem = useCallback(async (item: PostItem, attempt = 1): Promise<AnalysisResult> => {
    const apiTargets = [
      `${window.location.origin}/api/analyze-post`,
      "http://localhost:5000/api/analyze-post",
    ].filter((url, index, arr) => arr.indexOf(url) === index);

    for (const target of apiTargets) {
      try {
        const r = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item }),
        });
        if (r.status === 429) {
          await new Promise(x => setTimeout(x, 1500 * attempt));
          continue;
        }
        if (!r.ok) continue;

        const d = await r.json();
        return {
          category: d.category || item.category,
          text: d.text || d.post || item.text || "",
          sender: d.sender || item.sender,
          receiver: d.receiver || item.receiver,
          participants: d.participants || item.participants,
          username: d.username || item.username,
          reelOwner: d.reelOwner || item.reelOwner,
          postOwner: d.postOwner || item.postOwner,
          timestamp: d.timestamp || item.timestamp,
          extra: d.extra || item.extra,
          riskLevel: (["Low", "Medium", "High"].includes(d.riskLevel) ? d.riskLevel : "Low") as AnalysisResult["riskLevel"],
          riskScore: Math.min(100, Math.max(0, Number(d.riskScore) || 0)),
          reason: typeof d.reason === "string" ? d.reason : "No issue found.",
          suggestedAction: (["Safe", "Archive", "Delete"].includes(d.suggestedAction) ? d.suggestedAction : "Safe") as AnalysisResult["suggestedAction"],
        };
      } catch {
        continue;
      }
    }

    if (attempt < 3) {
      await new Promise(x => setTimeout(x, 1000 * attempt));
      return analyzeItem(item, attempt + 1);
    }

    return {
      ...item,
      riskLevel: "Low",
      riskScore: 0,
      reason: "AI scan fallback applied.",
      suggestedAction: "Safe",
    };
  }, []);

  const scanItems = useCallback(async (items: PostItem[]) => {
    setPage("analyzing");
    setResults([]);
    setProgress(0);
    setStatusMsg("");
    setLiveItems(items);
    setTotalToScan(items.length);

    const collected: AnalysisResult[] = [];
    const batchSize = 4;

    for (let start = 0; start < items.length; start += batchSize) {
      const batch = items.slice(start, start + batchSize);
      const analyzedBatch = await Promise.all(batch.map(item => analyzeItem(item)));

      for (const analyzedItem of analyzedBatch) {
        if (analyzedItem.text.length > 0) collected.push(analyzedItem);
      }

      setResults([...collected]);
      setProgress(Math.round((collected.length / items.length) * 100));
    }

    setPage("dashboard");
  }, [analyzeItem]);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !platform) return;
    if (fileRef.current) fileRef.current.value = "";

    if (!file.name.toLowerCase().endsWith(".zip")) { setUploadError("Please upload a .zip file."); return; }
    const mb = file.size / (1024 * 1024);
    if (mb > 700) { setUploadError(`File is ${Math.round(mb)}MB — max 700MB.`); return; }

    setUploading(true); setUploadError(""); setUploadPct(0);
    setStatusMsg(`Uploading ${Math.round(mb)}MB…`);

    const res = await uploadXHR(file, platform, (pct) => {
      setUploadPct(pct);
      setStatusMsg(pct < 100 ? `Uploading… ${pct}%` : "Parsing archive…");
    });

    if (!res.success) { setUploadError(res.error || "Upload failed."); setUploading(false); return; }

    const extracted: PostItem[] = res.items || [];
    if (extracted.length === 0) { setUploadError(res.error || "No content found."); setUploading(false); return; }

    setAllItems(extracted);
    setCounts(res.counts || {});
    setTotalToScan(extracted.length);
    setUploading(false);
    setActiveTab("all"); setRiskFilter("all"); setPage2(1);

    await scanItems(extracted);
  }, [platform, scanItems]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const high = useMemo(() => results.filter(r => r.riskLevel === "High").length, [results]);
  const med  = useMemo(() => results.filter(r => r.riskLevel === "Medium").length, [results]);
  const safeScore = useMemo(() =>
    results.length > 0 ? Math.round(results.filter(r => r.riskLevel === "Low").length / results.length * 100) : 0,
    [results]);
  const overallSafetyScore = useMemo(() => {
    if (results.length === 0) return 100;
    return Math.round(results.reduce((sum, item) => sum + (100 - item.riskScore), 0) / results.length);
  }, [results]);
  const finalVerdict = useMemo(() => verdictFromScore(overallSafetyScore), [overallSafetyScore]);
  const platformBreakdown = useMemo(() => {
    const source = Object.keys(counts).length ? counts : results.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    return (Object.entries(source) as Array<[string, number]>).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [counts, results]);

  const tabs = platform ? PLATFORM_TABS[platform] : [];

  const activeTabConfig = tabs.find(t => t.id === activeTab) || tabs[0];

  const filtered = useMemo(() => {
    let r = results;
    if (activeTab !== "all" && activeTabConfig?.categories.length) {
      r = r.filter(x => activeTabConfig.categories.includes(x.category));
    }
    if (riskFilter !== "all") r = r.filter(x => x.riskLevel === riskFilter);
    return r;
  }, [results, activeTab, activeTabConfig, riskFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page2 - 1) * PER_PAGE, page2 * PER_PAGE);

  const flaggedCount = useMemo(() => filtered.filter(r => r.riskLevel !== "Low").length, [filtered]);

  const reset = () => {
    setPage("home"); setPlatform(null); setAllItems([]); setResults([]);
    setProgress(0); setUploadPct(0); setUploadError(""); setStatusMsg("");
    setCounts({}); setActiveTab("all"); setRiskFilter("all"); setPage2(1);
    setLiveItems([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <EyeLogo className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">3rd EYE</span>
          </div>
          {page !== "home" && (
            <button type="button" onClick={reset}
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Exit
            </button>
          )}
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <AnimatePresence mode="wait">

          {/* ── HOME ── */}
          {page === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto text-center">
              <div className="mb-10 flex justify-center">
                <EyeLogo className="w-64 h-64 md:w-72 md:h-72" />
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                3rd EYE
              </h1>
              <p className="text-blue-400 text-lg md:text-xl font-medium tracking-[0.2em] uppercase mb-10">
                Scan Your Past. Secure Your Future.
              </p>
              <div className="max-w-3xl mx-auto mb-10">
                <p className="text-white/90 text-xl md:text-2xl font-semibold tracking-tight mb-4">
                  Before they judge you, audit yourself.
                </p>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                  Governments, recruiters, universities, and legal systems are increasingly reviewing digital behavior.
                  Your posts, comments, and messages are no longer just memories, they are part of your reputation.
                </p>
                <p className="text-blue-300 text-sm md:text-base font-medium mt-4 tracking-wide">
                  Don&apos;t let your past compromise your future. Review your digital footprint before someone else does.
                </p>
              </div>
              <button type="button" onClick={() => setPage("platform")}
                className="px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold transition-all inline-flex items-center gap-3 group text-lg shadow-lg shadow-blue-500/20 mb-20">
                Start Risk Analysis <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                {[
                  { p: "Instagram",  items: ["Posts", "Reels", "Stories", "Comments", "DMs"] },
                  { p: "Facebook",   items: ["Posts", "Comments", "Messenger", "Groups"] },
                  { p: "Twitter/X",  items: ["Tweets", "Replies", "Liked", "DMs"] },
                  { p: "YouTube",    items: ["Watch history", "Searches", "Comments", "Uploads"] },
                ].map((x, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5">
                    <h3 className="font-bold text-sm mb-3">{x.p}</h3>
                    <ul className="space-y-1">
                      {x.items.map((item, j) => (
                        <li key={j} className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 bg-blue-500 rounded-full shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PLATFORM ── */}
          {page === "platform" && (
            <motion.div key="platform" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-4">Select Platform</h2>
              <p className="text-zinc-400 text-center mb-10">Which platform's archive would you like to analyze?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setPlatform(p.id); setPage("upload"); }}
                    className={`p-8 rounded-3xl border border-white/5 bg-zinc-900/50 flex flex-col items-center gap-4 transition-all group ${p.hoverBorder} ${p.hoverBg}`}>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <p.Icon className={`w-8 h-8 ${p.iconClass}`} />
                    </div>
                    <span className="font-bold text-sm">{p.label}</span>
                    <span className="text-[10px] text-zinc-500 text-center">{p.format}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── UPLOAD ── */}
          {page === "upload" && platform && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <button type="button" onClick={() => setPage("platform")}
                  className="text-sm text-zinc-500 hover:text-white mb-4 inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-3xl font-bold mb-2 capitalize">Upload {platform} Archive</h2>
                <p className="text-zinc-400 text-sm">All content types will be scanned — no limits.</p>
              </div>

              <div className="mb-6 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                  <span className="font-bold text-sm">Deep AI Scan</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold ml-auto">precision engine</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your data stays safe while we uncover what could harm you.
                </p>
              </div>

              {/* Drop zone */}
              <div className="relative group mb-6">
                <input ref={fileRef} type="file" accept=".zip" onChange={handleFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploading} />
                <div className={`p-14 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center gap-5 overflow-hidden
                  ${uploading ? "border-blue-500/40 bg-blue-500/5" : "border-white/10 bg-zinc-900/50 group-hover:border-blue-500/50 group-hover:bg-blue-500/5"}`}>
                  {uploading ? (
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-blue-400/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-pulse" />
                      <Loader className="w-12 h-12 text-blue-400 animate-spin relative z-10" />
                    </div>
                  ) : <Upload className="w-14 h-14 text-zinc-600 group-hover:text-blue-500 transition-colors" />}
                  <div className="text-center">
                    <p className="text-lg font-bold mb-1">{uploading ? statusMsg : "Click or drag .zip file here"}</p>
                    <p className="text-zinc-500 text-sm">{uploading ? `${uploadPct}% uploaded` : "Up to 700MB"}</p>
                  </div>
                  {uploading && (
                    <div className="w-full max-w-sm space-y-2">
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.max(uploadPct, 6)}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-zinc-500">
                        <span>Upload</span>
                        <span>{uploadPct < 100 ? "Transfer" : "Parsing"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 mb-6">
                  <FileWarning className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm whitespace-pre-line">{uploadError}</p>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-blue-400" /> How to download your {platform} data
                  </h4>
                  <p className="text-xs text-zinc-500">Step-by-step guide</p>
                </div>
                <button type="button" onClick={() => setShowGuide(true)}
                  className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/30 transition-colors shrink-0 ml-4">
                  View Guide
                </button>
              </div>

              <AnimatePresence>
                {showGuide && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setShowGuide(false)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
                    <div className="relative z-10 w-full max-w-2xl">
                      <DownloadGuide platform={platform} onClose={() => setShowGuide(false)} />
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── ANALYZING ── */}
          {page === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="max-w-5xl mx-auto">

              {/* Progress header */}
              <div className="flex items-center gap-6 mb-8 p-5 rounded-2xl bg-zinc-900/60 border border-white/5 sticky top-20 z-10 backdrop-blur-sm">
                <div className="w-16 h-16 relative shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                      strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * progress) / 100}
                      className="text-blue-500 transition-all duration-300" />
                  </svg>
                  <span className="text-sm font-black relative z-10">{progress}%</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">AI Scanning {totalToScan} items…</h2>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>{results.length} analyzed</span>
                    <span className="text-red-400">{results.filter(r => r.riskLevel === "High").length} high risk</span>
                    <span className="text-amber-400">{results.filter(r => r.riskLevel === "Medium").length} medium</span>
                    <span className="text-emerald-400">{results.filter(r => r.riskLevel === "Low").length} safe</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-500">Estimated time</p>
                  <p className="text-sm font-bold text-zinc-300">
                    ~{Math.max(1, Math.round((totalToScan - results.length) * 0.6 / 60))} min left
                  </p>
                </div>
              </div>

              {/* Live content — grouped by category tabs */}
              {liveItems.length > 0 && (() => {
                // Group liveItems by category
                const groups: Record<string, PostItem[]> = {};
                for (const item of liveItems) {
                  if (!groups[item.category]) groups[item.category] = [];
                  groups[item.category].push(item);
                }
                const cats = Object.keys(groups);

                return (
                  <div className="space-y-8">
                    {cats.map(cat => {
                      const catItems = groups[cat];
                      // Get results for this category to show risk badges
                      const catResults = results.filter(r => r.category === cat);
                      const analyzed = catResults.length;
                      const flagged = catResults.filter(r => r.riskLevel !== "Low").length;

                      return (
                        <div key={cat}>
                          {/* Category header */}
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">{cat}s</h3>
                            <span className="text-xs text-zinc-600">({catItems.length} total)</span>
                            {analyzed > 0 && (
                              <span className="text-xs text-blue-400">{analyzed} scanned</span>
                            )}
                            {flagged > 0 && (
                              <span className="text-xs font-bold text-red-400">{flagged} flagged</span>
                            )}
                            <div className="flex-1 h-px bg-white/5" />
                          </div>

                          {/* Items for this category */}
                          <div className="space-y-2">
                            {catItems.slice(0, 8).map((item, i) => {
                              // Find AI result for this item if already scanned
                              const scanned = catResults.find(r =>
                                r.text === item.text &&
                                r.sender === item.sender &&
                                r.timestamp === item.timestamp
                              );

                              return (
                                <motion.div key={i}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.02 }}
                                  className={`p-4 rounded-xl border flex gap-4 items-start ${
                                    scanned?.riskLevel === "High"   ? "bg-red-500/5 border-red-500/20"
                                    : scanned?.riskLevel === "Medium" ? "bg-amber-500/5 border-amber-500/20"
                                    : scanned ? "bg-emerald-500/5 border-emerald-500/10"
                                    : "bg-zinc-900/40 border-white/5"
                                  }`}>

                                  {/* Left: scan status indicator */}
                                  <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center">
                                    {!scanned ? (
                                      <div className="w-3 h-3 rounded-full bg-zinc-700 animate-pulse" />
                                    ) : scanned.riskLevel === "High" ? (
                                      <div className="w-3 h-3 rounded-full bg-red-500" />
                                    ) : scanned.riskLevel === "Medium" ? (
                                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    {/* DM: show sender → receiver */}
                                    {item.category === "DM" && (item.sender || item.receiver) && (
                                      <div className="flex items-center gap-2 mb-1.5 text-xs">
                                        <span className="font-bold text-zinc-200">{item.sender || "?"}</span>
                                        <span className="text-zinc-600">→</span>
                                        <span className="font-bold text-zinc-200">{item.receiver || "?"}</span>
                                        {item.timestamp && <span className="text-zinc-600 ml-auto">{item.timestamp}</span>}
                                      </div>
                                    )}
                                    {/* Comment: show where */}
                                    {item.category === "Comment" && (item.reelOwner || item.postOwner || item.extra) && (
                                      <p className="text-xs text-zinc-500 mb-1">
                                        {item.extra === "Comment on Reel" && item.reelOwner
                                          ? `On @${item.reelOwner}'s reel`
                                          : item.extra === "Comment on Post" && item.postOwner
                                          ? `On @${item.postOwner}'s post`
                                          : item.extra}
                                        {item.timestamp && ` · ${item.timestamp}`}
                                      </p>
                                    )}
                                    {/* Watch: show channel */}
                                    {item.category === "Watch" && item.username && (
                                      <p className="text-xs text-zinc-500 mb-1">Channel: {item.username}{item.timestamp && ` · ${item.timestamp}`}</p>
                                    )}
                                    {/* Reply: show who to */}
                                    {item.category === "Reply" && item.receiver && (
                                      <p className="text-xs text-zinc-500 mb-1">→ {item.receiver}{item.timestamp && ` · ${item.timestamp}`}</p>
                                    )}

                                    <p className="text-sm text-zinc-300 leading-relaxed truncate">
                                      {(item.text || "").slice(0, 120)}{(item.text || "").length > 120 ? "…" : ""}
                                    </p>

                                    {scanned && scanned.riskLevel !== "Low" && (
                                      <p className="text-xs text-zinc-500 mt-1 truncate">{scanned.reason}</p>
                                    )}
                                  </div>

                                  {/* Right: risk badge */}
                                  {scanned && (
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase shrink-0 ${
                                      scanned.riskLevel === "High"   ? "bg-red-500/20 text-red-400"
                                      : scanned.riskLevel === "Medium" ? "bg-amber-500/20 text-amber-400"
                                      : "bg-emerald-500/20 text-emerald-400"}`}>
                                      {scanned.riskLevel}
                                    </span>
                                  )}
                                </motion.div>
                              );
                            })}
                            {catItems.length > 8 && (
                              <p className="text-xs text-zinc-600 pl-4">
                                +{catItems.length - 8} more {cat}s — all will appear in dashboard
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ── DASHBOARD ── */}
          {page === "dashboard" && platform && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto">

              {/* Header */}
              <div className="flex items-start justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-3xl font-bold">Risk Intelligence Report</h2>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                    }`}>
                      AI Scan
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm capitalize">{results.length} items from your {platform} archive</p>
                  <p className="text-xs text-zinc-500 mt-1">AI-based safety analysis across posts, comments, stories and DMs.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (allItems.length > 0) {
                        void scanItems(allItems);
                      } else {
                        setPage("upload");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all flex items-center gap-2">
                    Re-run AI Scan
                  </button>
                  <button type="button" onClick={reset}
                    className="px-5 py-2.5 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 text-sm">
                    <ArrowLeft className="w-4 h-4" /> New Scan
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Scanned", value: results.length },
                  { label: "Risky", value: high, color: "text-red-400" },
                  { label: "Moderate", value: med,  color: "text-amber-400" },
                  { label: "Safe", value: `${safeScore}%`, color: "text-emerald-400" },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center">
                    <div className={`text-2xl font-black mb-1 ${s.color || "text-white"}`}>{s.value}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-4 mb-8">
                <div className="p-5 rounded-3xl bg-zinc-900/50 border border-white/5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">Final Safety Score</p>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-black">{overallSafetyScore}%</span>
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${finalVerdict.chip}`}>
                          {finalVerdict.label}
                        </span>
                      </div>
                    </div>
                    <div className="w-28 h-28 rounded-full border border-white/10 bg-black/30 grid place-items-center">
                      <div className="text-center">
                        <div className={`text-2xl font-black ${finalVerdict.tone}`}>{finalVerdict.label}</div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">overall</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Final verdict blends posts, comments, stories and DMs so you can quickly see whether the archive looks safe, moderate or risky.
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-zinc-900/50 border border-white/5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-4">Archive Breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    {platformBreakdown.map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                        <div className="text-xl font-black text-white">{value}</div>
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {tabs.map(tab => {
                  const tabCats = tab.categories;
                  const tabTotal = tabCats.length === 0
                    ? results.length
                    : results.filter(r => tabCats.includes(r.category)).length;
                  const tabFlagged = tabCats.length === 0
                    ? results.filter(r => r.riskLevel !== "Low").length
                    : results.filter(r => tabCats.includes(r.category) && r.riskLevel !== "Low").length;
                  const isActive = tab.id === activeTab;

                  return (
                    <button key={tab.id} type="button"
                      onClick={() => { setActiveTab(tab.id); setPage2(1); setRiskFilter("all"); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        isActive
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}>
                      {tab.icon}
                      <span>{tab.label}</span>
                      <span className={`text-xs ${isActive ? "text-blue-200" : "text-zinc-600"}`}>
                        ({tabTotal})
                      </span>
                      {tabFlagged > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isActive ? "bg-white/20 text-white" : "bg-red-500/20 text-red-400"
                        }`}>
                          {tabFlagged} risk
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Risk filter */}
                <div className="ml-auto flex gap-2">
                  {[
                    { val: "all",    label: "All" },
                    { val: "High",   label: "Risky" },
                    { val: "Medium", label: "Moderate" },
                    { val: "Low", label: "Safe" },
                  ].map(f => (
                    <button key={f.val} type="button"
                      onClick={() => { setRiskFilter(f.val); setPage2(1); }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                        riskFilter === f.val
                          ? "bg-white/10 border-white/20 text-white"
                          : "border-white/5 text-zinc-500 hover:text-white hover:border-white/10"
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab description + count */}
              <div className="flex items-center gap-3 mb-5">
                <p className="text-sm text-zinc-500">
                  {activeTabConfig?.description} —{" "}
                  <span className="text-white font-bold">{filtered.length}</span> items
                  {flaggedCount > 0 && (
                    <span className="text-red-400 ml-1">· {flaggedCount} flagged</span>
                  )}
                </p>
              </div>

              {/* Content list */}
              {filtered.length === 0 ? (
                <div className="p-12 rounded-3xl border border-white/5 bg-zinc-900/50 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h4 className="text-lg font-bold mb-2">No content in this category</h4>
                  <p className="text-zinc-400 text-sm">Try another tab or clear the risk filter.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paged.map((r, i) => (
                      <ContentCard key={i} item={r} index={i} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-4">
                      <button type="button" onClick={() => setPage2(p => Math.max(1, p - 1))} disabled={page2 === 1}
                        className="px-4 py-2 rounded-lg bg-white/5 text-sm font-bold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">
                        Previous
                      </button>
                      <span className="text-sm text-zinc-400">
                        Page {page2} of {totalPages} ({filtered.length} items)
                      </span>
                      <button type="button" onClick={() => setPage2(p => Math.min(totalPages, p + 1))} disabled={page2 === totalPages}
                        className="px-4 py-2 rounded-lg bg-white/5 text-sm font-bold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="border-t border-white/5 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EyeLogo className="w-7 h-7" />
            <span className="font-bold">3rd EYE</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-white font-black text-base md:text-lg tracking-wide">© 2026 Sanskardeep Talikote</p>
            <p className="text-blue-300 font-bold text-sm md:text-base mt-1">
              Developer | +91 9403910943 | sanskardeepbtalikote19@gmail.com
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const AppWithBoundary = () => <App />;
export default AppWithBoundary;
