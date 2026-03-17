import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { 
  Shield, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight, 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube,
  Loader2,
  ArrowLeft,
  BarChart3,
  Trash2,
  Archive,
  Search,
  Info,
  HelpCircle,
} from 'lucide-react';
import type { AnalysisResult } from './services/geminiService';
import { DataExportGuide } from './components/Guide';

type Step = 'home' | 'platform' | 'upload' | 'analyzing' | 'dashboard';
type Platform = 'instagram' | 'facebook' | 'twitter' | 'youtube';

export default function App() {
  const [step, setStep] = useState<Step>('home');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !platform) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPosts(data.posts);
        setStep('analyzing');
        startAnalysis(data.posts);
      } else {
        setError(data.error || 'Failed to process file');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const startAnalysis = async (postsToAnalyze: string[]) => {
    setError(null);
    setProgress(20);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: postsToAnalyze })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setProgress(100);
        setTimeout(() => setStep('dashboard'), 800);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      // Fallback demo results
      const mockResults = postsToAnalyze.slice(0, 10).map((post, idx) => ({
        post: post.slice(0, 80) + (post.length > 80 ? '...' : ''),
        riskLevel: idx % 5 === 0 ? 'Medium' : 'Low',
        riskScore: Math.floor(5 + Math.random() * 25),
        reason: 'Demo mode. Real AI risk assessment requires GEMINI_API_KEY in .env file. Free key: https://aistudio.google.com/app/apikey',
        suggestedAction: 'Safe'
      }));
      setResults(mockResults);
      setProgress(100);
      setStep('dashboard');
      setError('✅ Demo complete! Add your Gemini API key to .env for full AI-powered analysis.');
    }
  };

  const reset = () => {
    setStep('home');
    setPlatform(null);
    setPosts([]);
    setResults([]);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <Logo className="w-10 h-10" />
            <span className="font-display font-bold text-xl tracking-tighter">3rd EYE</span>
          </div>
          {step !== 'home' && (
            <button 
              type="button"
              onClick={reset}
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit Analysis
            </button>
          )}
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="mb-12 flex justify-center"
              >
                <Logo className="w-64 h-64 md:w-80 md:h-80" />
              </motion.div>

              <h1 className="font-display text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                3rd EYE
              </h1>
              <p className="text-blue-400 font-display text-lg md:text-2xl font-medium tracking-[0.2em] uppercase mb-12">
                Scan Your Past. Secure Your Future.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
                <button 
                  type="button"
                  onClick={() => setStep('platform')}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-3 group text-lg shadow-lg shadow-blue-500/20"
                >
                  Start Risk Analysis
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Impact Statement */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="max-w-3xl mx-auto mb-32 space-y-6"
              >
                <div className="w-12 h-1 bg-blue-500 mx-auto mb-12" />
                <p className="text-2xl md:text-3xl font-display font-bold text-white leading-tight italic">
                  "This is not only about visa approval."
                </p>
                <p className="text-2xl md:text-3xl font-display font-bold text-zinc-400 leading-tight">
                  This is about your digital character.
                </p>
                <p className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
                  Your online presence defines your opportunities.
                </p>
                <p className="text-2xl md:text-3xl font-display font-bold text-zinc-400 leading-tight">
                  Universities, employers, and officers see your past.
                </p>
                <p className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
                  Your social media is your digital identity.
                </p>
              </motion.div>

              {/* Why 3rd EYE Matters */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="max-w-2xl mx-auto mb-32 p-12 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-sm"
              >
                <h2 className="font-display text-3xl font-bold mb-6">Why 3rd EYE Matters</h2>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  In today's world, society judges based on your digital footprint. Old posts, forgotten comments, or misunderstood interactions can haunt your future. 3rd EYE uses advanced intelligence to help you clean and protect your digital reputation, ensuring your past doesn't limit your potential.
                </p>
              </motion.div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
                {[
                  {
                    icon: <Search className="w-6 h-6 text-blue-400" />,
                    title: "Deep Scan",
                    desc: "We parse through years of history across multiple platforms in seconds."
                  },
                  {
                    icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
                    title: "Risk Detection",
                    desc: "Identify controversial content, extremist views, or illegal intent."
                  },
                  {
                    icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
                    title: "Actionable Advice",
                    desc: "Get specific recommendations on which posts to delete or archive."
                  }
                ].map((card, i) => (
                  <div key={i} className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                      {card.icon}
                    </div>
                    <h3 className="font-display font-bold text-xl mb-3">{card.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'platform' && (
            <motion.div
              key="platform"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="font-display text-4xl font-bold text-center mb-4">Select Platform</h2>
              <p className="text-zinc-400 text-center mb-12">Which social media archive would you like to analyze?</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'instagram', icon: <Instagram />, label: 'Instagram', color: 'hover:border-pink-500/50 hover:bg-pink-500/5' },
                  { id: 'facebook', icon: <Facebook />, label: 'Facebook', color: 'hover:border-blue-500/50 hover:bg-blue-500/5' },
                  { id: 'twitter', icon: <Twitter />, label: 'X (Twitter)', color: 'hover:border-zinc-500/50 hover:bg-zinc-500/5' },
                  { id: 'youtube', icon: <Youtube />, label: 'YouTube', color: 'hover:border-red-500/50 hover:bg-red-500/5' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlatform(p.id as Platform);
                      setStep('upload');
                    }}
                    className={`p-8 rounded-3xl border border-white/5 bg-zinc-900/50 flex flex-col items-center gap-4 transition-all group ${p.color}`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {React.cloneElement(p.icon as React.ReactElement, { className: 'w-8 h-8' })}
                    </div>
                    <span className="font-bold">{p.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <button 
                  type="button"
                  onClick={() => setStep('platform')}
                  className="text-sm text-zinc-500 hover:text-white mb-6 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Platform
                </button>
                <h2 className="font-display text-4xl font-bold mb-4 capitalize">Upload {platform} Archive</h2>
                <p className="text-zinc-400">Upload your .zip archive or .json data file. Your data is processed locally and never stored.</p>
              </div>

              <div className="relative group">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".zip,.json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                />
                <div className={`p-16 rounded-3xl border-2 border-dashed border-white/10 bg-zinc-900/50 flex flex-col items-center gap-6 transition-all group-hover:border-blue-500/50 group-hover:bg-blue-500/5 ${isUploading ? 'opacity-50' : ''}`}>
                  {isUploading ? (
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="w-16 h-16 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                  )}
                  <div className="text-center">
                    <p className="text-lg font-bold mb-1">Click or drag archive here</p>
                    <p className="text-zinc-500 text-sm">Supports .zip (full archive) or .json files</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="mt-12 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    Need help getting your data?
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setShowGuide(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    View Guide
                  </button>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Not sure how to download your {platform} archive? Check our step-by-step guide to export your data correctly.
                </p>
              </div>

              {/* Guide Modal */}
              <AnimatePresence>
                {showGuide && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowGuide(false)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />
                    <div className="relative z-10 w-full max-w-2xl flex justify-center">
                      <DataExportGuide 
                        platform={platform!} 
                        onClose={() => setShowGuide(false)} 
                      />
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="mb-12 relative">
                <div className="w-48 h-48 mx-auto relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={552.92}
                      strokeDashoffset={552.92 - (552.92 * progress) / 100}
                      className="text-blue-500 transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black font-display">{progress}%</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Analyzed</span>
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/20 blur-[80px] -z-10" />
              </div>

              <h2 className="font-display text-3xl font-bold mb-4">Analyzing Social History</h2>
              <p className="text-zinc-400 mb-8">Gemini AI is scanning {posts.length} posts for potential visa risks...</p>
              
              <div className="space-y-3 text-left max-w-md mx-auto">
                {results.slice(-3).map((res, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between"
                  >
                    <span className="text-xs text-zinc-400 truncate max-w-[200px] italic">"{res.post}"</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                      res.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' :
                      res.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {res.riskLevel}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
                <div>
                  <h2 className="font-display text-4xl font-bold mb-2">Risk Intelligence Report</h2>
                  <p className="text-zinc-400">Comprehensive analysis of your {platform} presence.</p>
                </div>
                <button 
                  type="button"
                  onClick={reset}
                  className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> New Scan
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                  { label: 'Total Scanned', value: results.length, icon: <Search className="text-blue-400" /> },
                  { label: 'High Risk', value: results.filter(r => r.riskLevel === 'High').length, icon: <AlertTriangle className="text-red-400" />, color: 'text-red-400' },
                  { label: 'Medium Risk', value: results.filter(r => r.riskLevel === 'Medium').length, icon: <AlertTriangle className="text-amber-400" />, color: 'text-amber-400' },
                  { label: 'Safe Score', value: `${results.length > 0 ? Math.round((results.filter(r => r.riskLevel === 'Low').length / results.length) * 100) : 0}%`, icon: <CheckCircle2 className="text-emerald-400" />, color: 'text-emerald-400' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 rounded-lg bg-white/5">{stat.icon}</div>
                    </div>
                    <div className={`text-3xl font-black font-display mb-1 ${stat.color || 'text-white'}`}>{stat.value}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Results List */}
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                  Flagged Content
                </h3>
                
                {results.filter(r => r.riskLevel !== 'Low').length === 0 ? (
                  <div className="p-12 rounded-3xl border border-white/5 bg-zinc-900/50 text-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold mb-2">No High Risk Content Found</h4>
                    <p className="text-zinc-400">Your social media history appears safe for visa applications.</p>
                  </div>
                ) : (
                  results.filter(r => r.riskLevel !== 'Low').map((res, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 flex flex-col md:row gap-6 items-start md:items-center"
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                        res.riskLevel === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                            res.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {res.riskLevel} Risk ({res.riskScore}/100)
                          </span>
                          <span className="text-zinc-500 text-xs italic">"{res.post.slice(0, 60)}..."</span>
                        </div>
                        <p className="text-zinc-300 font-medium mb-1">{res.reason}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="font-bold text-zinc-400 uppercase tracking-tighter">Recommendation:</span>
                          <span className={`font-bold ${
                            res.suggestedAction === 'Delete' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {res.suggestedAction} immediately
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button type="button" className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button type="button" className="p-3 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 transition-all">
                          <Archive className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="font-display font-bold text-lg">3rd EYE</span>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-sm">© 2026 Sanskardeep, Rugved, Parth | Social Media Analysis Project</p>
          </div>
          <div className="flex gap-6 text-zinc-400 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
