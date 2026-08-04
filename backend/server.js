require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "http://localhost:4200";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const fs = require('fs');
const path = require('path');
 
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
 
function readStats() {
  try {
    if (!fs.existsSync(STATS_FILE)) {
      const initial = {
        totalUsers: 0,
        totalAnalyses: 0,
        totalJobMatches: 0,
        totalCoverLetters: 0,
        scores: [],           // { score, date }
        templateUsage: {},    // { "Modern Resume": 3, ... }
      };
      fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
      fs.writeFileSync(STATS_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to read stats file:', err);
    return {
      totalUsers: 0,
      totalAnalyses: 0,
      totalJobMatches: 0,
      totalCoverLetters: 0,
      scores: [],
      templateUsage: {},
    };
  }
}
 
function writeStats(stats) {
  try {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Failed to write stats file:', err);
  }
}
 
// Chhota helper — kisi bhi counter ko +1 karne k liye,
// aur (optional) score ko history mein log karne k liye
function trackEvent(counterKey, score) {
  const stats = readStats();
  stats[counterKey] = (stats[counterKey] || 0) + 1;
  if (typeof score === 'number' && !Number.isNaN(score)) {
    stats.scores.push({ score, date: new Date().toISOString() });
    // sirf last 200 scores rakhte hain, file bohot bari na ho
    if (stats.scores.length > 200) {
      stats.scores = stats.scores.slice(-200);
    }
  }
  writeStats(stats);
}
 

app.use(
  cors({
    origin: ALLOWED_ORIGIN.split(",").map((s) => s.trim()),
  })
);

app.use(express.json({ limit: "2mb" }));

const SYSTEM_PROMPT = `
You are an expert ATS Resume Analyzer.

Return ONLY valid JSON.

{
  "overallScore": 0,
  "summary": "",
  "categories": [
    {
      "name": "Content & Impact",
      "score": 0,
      "comment": ""
    },
    {
      "name": "Formatting & Clarity",
      "score": 0,
      "comment": ""
    },
    {
      "name": "ATS Friendliness",
      "score": 0,
      "comment": ""
    },
    {
      "name": "Keywords & Relevance",
      "score": 0,
      "comment": ""
    }
  ],
  "strengths": [],
  "weaknesses": [],
  "suggestions": []
}
`;
app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        error: "resumeText is required and must be at least 50 characters.",
      });
    }

    const prompt = `
${SYSTEM_PROMPT}

Resume:

${resumeText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });

    let text = response.text.trim();

    // Remove markdown code fences if present
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const result = JSON.parse(text);
    trackEvent('totalAnalyses', result.overallScore);

    res.json(result);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to analyze resume.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});
app.get("/api/models", async (req, res) => {
  try {
    const models = await ai.models.list();
    res.json(models);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

// ============================================================
// REPLACE the /api/match-job route in your server.js with THIS
// (this version uses `ai.models.generateContent` — same as your
// existing /api/analyze route — instead of the wrong `anthropic` client)
//
// Also move this whole block to BEFORE app.listen(...) in your file,
// alongside your other app.post(...) routes — cleaner and avoids confusion.
// ============================================================

const JOB_MATCH_SYSTEM_PROMPT = `
You are an expert recruiter and ATS system.

You will be given a candidate's resume text and a job description.
Compare them and return ONLY valid JSON, no markdown fences, no preamble.

{
  "matchScore": 0,
  "summary": "",
  "matchedKeywords": [],
  "missingKeywords": [],
  "suggestions": []
}

matchScore is an integer 0-100 for how well the resume fits this specific job.
summary is one or two sentences, specific to this resume and job.
matchedKeywords: skills/keywords from the job description the resume already covers (max 8).
missingKeywords: important skills/keywords from the job description the resume is missing or weak on (max 8).
suggestions: concrete changes to the resume that would raise the match score (max 5).
`;

app.post('/api/match-job', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'resumeText is required and must be at least 50 characters.' });
    }
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 30) {
      return res.status(400).json({ error: 'jobDescription is required and must be at least 30 characters.' });
    }

    const prompt = `
${JOB_MATCH_SYSTEM_PROMPT}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    let text = response.text.trim();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    trackEvent('totalJobMatches', parsed.matchScore);
    res.json(parsed);
  } catch (err) {
    console.error('Job match error:', err);
    res.status(500).json({ error: 'Something went wrong while matching against the job description.' });
  }
});
// ============================================================
// ADD THIS to your backend/server.js — put it alongside your
// other app.post(...) routes (before app.listen(...)).
// Uses `ai.models.generateContent` — same pattern as your
// existing /api/analyze and /api/match-job routes.
// ============================================================

const COVER_LETTER_SYSTEM_PROMPT = `
You are an expert career coach who writes concise, natural-sounding cover letters.

You will be given a candidate's resume text, and optionally a job description.
Write a professional cover letter for this candidate.

Return ONLY valid JSON, no markdown fences, no preamble:

{
  "coverLetter": ""
}

Rules for the cover letter itself:
- 250-350 words, 3-4 short paragraphs.
- First-person voice, as if the candidate wrote it themselves.
- Reference specific, real details from the resume (roles, achievements, skills) — never generic filler.
- If a job description is provided, tailor it directly to that role and mention 2-3 matching qualifications.
- If no job description is provided, write a strong general cover letter highlighting the candidate's top strengths.
- Do NOT invent facts, companies, or numbers that are not in the resume.
- No placeholder brackets like [Company Name] unless a job description didn't specify one — in that case use "your team" or similar natural phrasing instead of brackets.
- End with a simple, confident closing line (no "Sincerely, [Your Name]" signature block needed).
`;

app.post('/api/generate-cover-letter', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'resumeText is required and must be at least 50 characters.' });
    }

    const jobPart = jobDescription && jobDescription.trim().length > 0
      ? `\n\nJOB DESCRIPTION (tailor the letter to this):\n${jobDescription}`
      : '\n\n(No specific job description provided — write a strong general cover letter.)';

    const prompt = `
${COVER_LETTER_SYSTEM_PROMPT}

RESUME:
${resumeText}
${jobPart}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    let text = response.text.trim();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    trackEvent('totalCoverLetters');
    res.json(parsed);
  } catch (err) {
    console.error('Cover letter generation error:', err);
    res.status(500).json({ error: 'Something went wrong while generating the cover letter.' });
  }
});
app.post('/api/track-signup', (req, res) => {
  trackEvent('totalUsers');
  res.json({ ok: true });
});
 
// Jab koi template "Use" karta hai, usage count k liye (optional)
app.post('/api/track-template-use', (req, res) => {
  try {
    const { templateName } = req.body || {};
    if (!templateName) return res.status(400).json({ error: 'templateName required' });
    const stats = readStats();
    stats.templateUsage[templateName] = (stats.templateUsage[templateName] || 0) + 1;
    writeStats(stats);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to track template use.' });
  }
});
 
// Admin dashboard ye endpoint call karta hai — sab kuch aggregate kar k deta hai
app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = readStats();
 
    const scores = stats.scores.map((s) => s.score);
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
 
    // score distribution buckets: 0-40, 40-60, 60-80, 80-100
    const buckets = { low: 0, mid: 0, good: 0, great: 0 };
    scores.forEach((s) => {
      if (s < 40) buckets.low++;
      else if (s < 60) buckets.mid++;
      else if (s < 80) buckets.good++;
      else buckets.great++;
    });
 
    const recentActivity = stats.scores.slice(-10).reverse();
 
    res.json({
      totalUsers: stats.totalUsers,
      totalAnalyses: stats.totalAnalyses,
      totalJobMatches: stats.totalJobMatches,
      totalCoverLetters: stats.totalCoverLetters,
      averageScore,
      scoreDistribution: buckets,
      templateUsage: stats.templateUsage,
      recentActivity,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load admin stats.' });
  }
})
// ============================================================
// ADD THIS to your backend/server.js — put it alongside your
// other app.post(...) routes (before app.listen(...)).
// Uses `ai.models.generateContent` — same pattern as your other routes.
//
// Don't forget: if you added the admin-dashboard trackEvent() calls,
// this route doesn't need one (no score involved).
// ============================================================

const IMPROVE_BULLETS_SYSTEM_PROMPT = `
You are an expert resume writer. You will be given a candidate's raw
experience description (one bullet point per line), and optionally the
role/company for context.

Rewrite EACH line into a strong, professional resume bullet point.

Return ONLY valid JSON, no markdown fences, no preamble:

{
  "improved": ""
}

"improved" should be the rewritten bullet points, one per line (same
number of lines as the input, separated by \\n), following these rules:
- Start each line with a strong action verb (Led, Built, Reduced, Launched, etc.)
- Make impact concrete and outcome-focused where the input already implies one.
- Do NOT invent specific numbers, percentages, or metrics that are not
  implied by the original text — only sharpen wording, don't fabricate facts.
- Keep each bullet to one line, concise (under ~25 words).
- Remove filler words ("responsible for", "worked on", "helped with") and
  replace with direct, active phrasing.
- Preserve the original meaning and any real details (tools, numbers, names).
`;

app.post('/api/improve-bullets', async (req, res) => {
  try {
    const { text, context } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({ error: 'text is required.' });
    }

    const contextPart = context && context.trim().length > 0
      ? `\n\nRole/context: ${context}`
      : '';

    const prompt = `
${IMPROVE_BULLETS_SYSTEM_PROMPT}

ORIGINAL BULLET POINTS:
${text}
${contextPart}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    let responseText = response.text.trim();
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (err) {
    console.error('Bullet improve error:', err);
    res.status(500).json({ error: 'Something went wrong while improving the bullet points.' });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
