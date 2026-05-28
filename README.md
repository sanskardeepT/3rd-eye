# 👁️ 3rd Eye – AI Powered Social Media Risk Analyzer

3rd Eye is an AI-powered social media intelligence platform designed to analyze online posts for potential visa, compliance, reputation, and background verification risks.

The platform uses Google Gemini AI to evaluate social media content and generate structured risk assessments with clear explanations, risk scores, and recommended actions.

It is built for users who want to proactively review their digital footprint before:

* Visa applications
* Immigration reviews
* Background verification
* Job screenings
* Compliance checks
* Public profile evaluations

Instead of manually reviewing hundreds of posts, 3rd Eye uses AI to identify potentially sensitive, controversial, or high-risk content in seconds.

---

# 🚀 What 3rd Eye Does

3rd Eye acts like an intelligent digital reputation scanner.

Users simply enter a social media post, and the system analyzes it using AI-powered contextual understanding.

The platform then generates:

✅ Risk level classification
✅ Risk score (0–100)
✅ AI-generated explanation
✅ Suggested action
✅ Structured compliance-style assessment

This creates a simplified way to identify content that could create issues during sensitive review processes.

---

# ✨ Core Features

## 🧠 AI-Powered Risk Analysis

The system uses Google Gemini AI to understand:

* Tone
* Context
* Political sensitivity
* Aggressive language
* Controversial topics
* Compliance concerns
* Reputation impact

instead of relying only on keyword matching.

This enables more realistic and context-aware analysis.

---

## 📊 Risk Classification System

Every analyzed post is categorized into:

* 🟢 Low Risk
* 🟡 Medium Risk
* 🔴 High Risk

based on AI interpretation and contextual analysis.

---

## 🎯 Smart Risk Score Generation

3rd Eye generates a numerical risk score from:

```bash id="d4f8jp"
0 → 100
```

to provide measurable risk severity.

Lower scores indicate safer content, while higher scores suggest potential concerns.

---

## 📝 Structured AI Explanations

Instead of vague outputs, the system provides:

* Clear reasoning
* Risk context
* Potential concerns
* Interpretation summary

This makes the analysis more understandable and actionable.

---

## ⚠️ Suggested Action Engine

Based on the analysis, the system recommends actions such as:

* Safe to Keep
* Archive Post
* Delete Post
* Review Manually

This helps users make informed decisions about their online content.

---

## 🎨 Modern UI Experience

The frontend is designed with:

* Smooth animations
* Responsive layouts
* Minimal interface
* Fast interactions
* Clean visual hierarchy

for a modern AI-product experience.

---

# 🛠️ Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Lucide Icons
* Motion

## Backend

* Node.js
* Express.js
* TypeScript
* tsx runtime

## AI Integration

* Google Gemini API
* Structured JSON schema validation

## Deployment

* Vercel
* Environment Variable Configuration

---

# 📂 Project Structure

```bash id="r8n2xm"
3rd-eye/
│
├── server.ts
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   │   └── geminiService.ts
│   └── main.tsx
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

# ⚡ How It Works

## Step 1 — User Input

The user enters a social media post into the application.

Examples:

* Tweets
* Instagram captions
* Facebook posts
* LinkedIn content
* Public comments

---

## Step 2 — AI Processing

The backend securely sends the content to the Gemini AI model for contextual evaluation.

The analysis focuses on:

* Sensitive language
* Political discussions
* Hate speech indicators
* Threat perception
* Reputation concerns
* Compliance-related patterns

---

## Step 3 — Structured JSON Validation

The AI response is validated against a strict JSON schema to ensure:

* Predictable outputs
* Consistent formatting
* Reliable frontend rendering
* Reduced parsing failures

---

## Step 4 — Risk Report Generation

The application extracts and displays:

* Risk Level
* Risk Score
* Explanation
* Suggested Action

inside the frontend dashboard.

---

# 🛡️ Security Architecture

3rd Eye follows a server-side security-first design.

## 🔐 Secure API Key Handling

Google Gemini API keys are never exposed in the frontend.

All AI communication happens securely through the backend server.

---

## 📦 Structured AI Output Validation

The application validates AI responses before rendering them.

Benefits include:

* Stable UI behavior
* Reduced malformed responses
* Better reliability
* Safer production deployments

---

## ⚠️ Error Handling Protection

Fallback handling prevents crashes caused by:

* Invalid AI responses
* Network failures
* Unexpected schema mismatches

This improves production stability.

---

# 🚀 Local Development Setup

## Install Dependencies

```bash id="h9t2ve"
npm install
```

---

## Start Development Server

```bash id="x2m7la"
npm run dev
```

---

# 🌐 Environment Variables

Create a:

```bash id="n5p1wj"
.env
```

file and configure:

```env id="q8d3vk"
GEMINI_API_KEY=
PORT=
```

Never expose API keys publicly in frontend code.

---

# ☁️ Deployment

3rd Eye is optimized for modern frontend deployment workflows.

## Frontend Hosting

* Vercel
* Netlify
* Static Hosting

## Backend Hosting

* Render
* Railway
* VPS
* Node.js Servers

---

# 📈 Why 3rd Eye Matters

In today’s world, online activity is increasingly reviewed during:

* Visa applications
* University admissions
* Employment screening
* Public reputation checks
* Compliance verification

Many people unknowingly leave sensitive or risky public content online.

3rd Eye aims to provide:

✅ Faster review
✅ AI-assisted moderation
✅ Better digital awareness
✅ Structured risk analysis
✅ Cleaner online reputation management

---

# 🧠 Future Roadmap

Planned future upgrades include:

* Multi-platform post scanning
* Full social profile analysis
* OCR-based image text detection
* Sentiment analytics dashboard
* Browser extension support
* AI-powered compliance assistant
* Exportable PDF reports
* Real-time monitoring system
* Multilingual analysis
* Reputation trend tracking

---

# 📌 Vision

The vision behind 3rd Eye is to build an AI-powered digital reputation intelligence system that helps users understand how their online presence may be interpreted in high-stakes review environments.

The goal is not censorship.

The goal is awareness, risk visibility, and smarter digital decision-making.

---

# 📄 License

This project is intended for educational, research, compliance-awareness, and AI experimentation purposes.

---

# ⭐ Support

If you found this project useful:

* Star the repository
* Fork the project
* Open pull requests
* Suggest improvements
* Share feedback

Your digital footprint matters more than ever 👁️
