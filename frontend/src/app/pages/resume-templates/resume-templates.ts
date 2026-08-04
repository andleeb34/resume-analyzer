import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/*
  ============================================================
  RESUME TEMPLATES + BUILDER + AI ANALYZE — Angular 21 standalone
  ============================================================
  4 templates ab hain (pehle 3 thi). Ek template ('Executive Resume')
  photo support k sath hai — form mein photo upload dikhta hai aur
  preview mein gol avatar photo show hoti hai.

  Experience aur Education ab plain textarea nahi rahe — structured
  entries hain (role/company/dates/description, degree/school/dates)
  jisay "+ Add" button se jitni chahain utni entries add kar sakti hain.
  Ye zyada professional CV jaisa result deta hai.

  AI ANALYZE:
  - `analyzeResume()` formData ko ek resume-text mein assemble karta hai
  - backend `/api/analyze` ko POST karta hai (same shape jo pehle banaya tha)
  - Result (score, missing items, suggestions) neeche result panel mein show hota hai

  ⚠️ API_BASE apne backend URL se match karain agar different hai.
  ============================================================
*/

export interface ResumeTemplate {
  title: string;
  tagline: string;
  atsScore: number;
  features: string[];
  skills: string[];
  hasPhoto: boolean; // true = form/preview mein photo upload + avatar dikhega
}

export interface ExperienceEntry {
  role: string;
  company: string;
  dates: string;
  description: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  dates: string;
}

export interface ResumeFormData {
  fullName: string;
  title: string; // e.g. "Product Designer" — professional templates mein header k neeche dikhta hai
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string; // comma separated
  photoDataUrl: string | null;
}

export interface AnalysisCategory {
  name: string;
  score: number;
  comment: string;
}

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  categories: AnalysisCategory[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface JobMatchResult {
  matchScore: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

// Backend proxy endpoint — apne server ka URL yahan match karain agar different hai
const API_BASE = 'http://localhost:3000';

function emptyExperience(): ExperienceEntry {
  return { role: '', company: '', dates: '', description: '' };
}

function emptyEducation(): EducationEntry {
  return { degree: '', school: '', dates: '' };
}

@Component({
  selector: 'app-resume-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-templates.html',
  styleUrl: './resume-templates.scss',
})
export class ResumeTemplatesComponent {
  constructor(private http: HttpClient) {}

  // ============================================================
  // TEMPLATES (ab 4 hain — 4th mein photo support hai)
  // ============================================================
  templates: ResumeTemplate[] = [
    {
      title: 'Modern Resume',
      tagline: 'Clean, ATS-optimized layout for most roles',
      atsScore: 98,
      features: ['ATS friendly', 'HR approved', 'One page layout', 'Easy to edit'],
      skills: ['Figma', 'React', 'UX research', 'Prototyping'],
      hasPhoto: false,
    },
    {
      title: 'Professional Resume',
      tagline: 'Structured layout for corporate and finance roles',
      atsScore: 96,
      features: ['ATS friendly', 'HR approved', 'One page layout', 'Easy to edit'],
      skills: ['Excel', 'SQL', 'Leadership', 'Analytics'],
      hasPhoto: false,
    },
    {
      title: 'Creative Resume',
      tagline: 'A bit more personality, still fully ATS-safe',
      atsScore: 94,
      features: ['ATS friendly', 'Portfolio ready', 'Two page layout', 'Easy to edit'],
      skills: ['Branding', 'Illustration', 'Adobe XD', 'Motion'],
      hasPhoto: false,
    },
    {
      title: 'Executive Resume',
      tagline: 'Photo-ready, detailed layout for senior & experienced roles',
      atsScore: 92,
      features: ['Profile photo', 'Detailed experience', 'Best for 5+ yrs experience', 'Easy to edit'],
      skills: ['Strategy', 'Leadership', 'Stakeholder mgmt', 'P&L ownership'],
      hasPhoto: true,
    },
  ];

  hoveredIndex = signal<number | null>(null);
  activeSkillKey = signal<string | null>(null);

  onCardEnter(index: number) {
    this.hoveredIndex.set(index);
  }

  onCardLeave() {
    this.hoveredIndex.set(null);
  }

  isHovered(index: number): boolean {
    return this.hoveredIndex() === index;
  }

  toggleSkill(cardIndex: number, skillIndex: number, event: Event) {
    event.stopPropagation();
    const key = `${cardIndex}-${skillIndex}`;
    this.activeSkillKey.set(this.activeSkillKey() === key ? null : key);
  }

  isSkillActive(cardIndex: number, skillIndex: number): boolean {
    return this.activeSkillKey() === `${cardIndex}-${skillIndex}`;
  }

  skillBars = [
    { label: 'Figma', value: 90 },
    { label: 'UX research', value: 75 },
  ];

  onPreview(template: ResumeTemplate) {
    console.log('Preview:', template.title);
  }

  // ============================================================
  // BUILDER VIEW
  // ============================================================
  viewMode = signal<'gallery' | 'builder'>('gallery');
  selectedTemplate = signal<ResumeTemplate | null>(null);

  formData: ResumeFormData = {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: [emptyExperience()],
    education: [emptyEducation()],
    skills: '',
    photoDataUrl: null,
  };

  onUse(template: ResumeTemplate) {
    this.selectedTemplate.set(template);
    this.viewMode.set('builder');
    this.analysisResult.set(null);
    this.analysisError.set(null);
    this.jobMatchResult.set(null);
    this.jobMatchError.set(null);
    this.showJobMatchBox.set(false);
    this.coverLetterResult.set(null);
    this.coverLetterError.set(null);
    this.bulletImproveError.set(null);
    this.justImprovedIndex.set(null);

    // Admin dashboard k liye fire-and-forget tracking call
    this.http.post(`${API_BASE}/api/track-template-use`, { templateName: template.title }).subscribe({
      error: (err) => console.warn('Template-use tracking failed (non-blocking):', err),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToGallery() {
    this.viewMode.set('gallery');
    this.selectedTemplate.set(null);
  }

  get skillsList(): string[] {
    return this.formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // ----- Experience: add/remove entries -----
  addExperience() {
    this.formData.experience.push(emptyExperience());
  }

  removeExperience(index: number) {
    this.formData.experience.splice(index, 1);
    if (this.formData.experience.length === 0) {
      this.formData.experience.push(emptyExperience());
    }
  }

  // ----- Education: add/remove entries -----
  addEducation() {
    this.formData.education.push(emptyEducation());
  }

  removeEducation(index: number) {
    this.formData.education.splice(index, 1);
    if (this.formData.education.length === 0) {
      this.formData.education.push(emptyEducation());
    }
  }

  // ----- Photo upload (only shown for hasPhoto templates) -----
  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.formData.photoDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.formData.photoDataUrl = null;
  }

  // filled (non-empty) experience/education entries only — for preview + analysis
  get filledExperience(): ExperienceEntry[] {
    return this.formData.experience.filter(
      (e) => e.role.trim() || e.company.trim() || e.description.trim()
    );
  }

  get filledEducation(): EducationEntry[] {
    return this.formData.education.filter((e) => e.degree.trim() || e.school.trim());
  }

  // ============================================================
  // PDF DOWNLOAD (print-based, no extra dependency)
  // ============================================================
  downloadPdf() {
    window.print();
  }

  // ============================================================
  // AI ANALYZE — score + missing items via backend
  // ============================================================
  isAnalyzing = signal(false);
  analysisResult = signal<AnalysisResult | null>(null);
  analysisError = signal<string | null>(null);

  // form fields ko ek plain resume-text mein jodta hai, jo backend ko bheja jata hai
  private buildResumeText(): string {
    const parts: string[] = [];

    if (this.formData.fullName) parts.push(this.formData.fullName);
    if (this.formData.title) parts.push(this.formData.title);
    if (this.formData.email || this.formData.phone || this.formData.location) {
      parts.push(
        [this.formData.email, this.formData.phone, this.formData.location]
          .filter(Boolean)
          .join(' | ')
      );
    }

    if (this.formData.summary) {
      parts.push('\nSUMMARY\n' + this.formData.summary);
    }

    if (this.filledExperience.length) {
      const expLines = this.filledExperience.map((e) => {
        const header = [e.role, e.company, e.dates].filter(Boolean).join(' — ');
        return e.description ? `${header}\n${e.description}` : header;
      });
      parts.push('\nEXPERIENCE\n' + expLines.join('\n\n'));
    }

    if (this.filledEducation.length) {
      const eduLines = this.filledEducation.map((e) =>
        [e.degree, e.school, e.dates].filter(Boolean).join(' — ')
      );
      parts.push('\nEDUCATION\n' + eduLines.join('\n'));
    }

    if (this.skillsList.length) {
      parts.push('\nSKILLS\n' + this.skillsList.join(', '));
    }

    return parts.join('\n');
  }

  async analyzeResume() {
    const resumeText = this.buildResumeText().trim();

    if (resumeText.length < 50) {
      this.analysisError.set('Please fill in more details (summary, experience, etc.) before analyzing.');
      this.analysisResult.set(null);
      return;
    }

    this.isAnalyzing.set(true);
    this.analysisError.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AnalysisResult>(`${API_BASE}/api/analyze`, { resumeText })
      );
      this.analysisResult.set(response);
    } catch (err) {
      console.error('Analyze failed:', err);
      const msg = 'Could not analyze right now. Make sure the backend server is running, then try again.';
      this.analysisError.set(msg);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  closeAnalysis() {
    this.analysisResult.set(null);
    this.analysisError.set(null);
  }

  // ============================================================
  // JOB DESCRIPTION MATCH — resume ko ek specific job posting k
  // against score karta hai (matched/missing keywords + suggestions)
  // ============================================================
  showJobMatchBox = signal(false);
  jobDescription = signal('');
  isMatchingJob = signal(false);
  jobMatchResult = signal<JobMatchResult | null>(null);
  jobMatchError = signal<string | null>(null);

  toggleJobMatchBox() {
    this.showJobMatchBox.set(!this.showJobMatchBox());
  }

  async checkJobMatch() {
    const resumeText = this.buildResumeText().trim();
    const jobText = this.jobDescription().trim();

    if (resumeText.length < 50) {
      this.jobMatchError.set('Please fill in more resume details first (summary, experience, etc.).');
      this.jobMatchResult.set(null);
      return;
    }
    if (jobText.length < 30) {
      this.jobMatchError.set('Please paste a fuller job description (at least a few sentences).');
      this.jobMatchResult.set(null);
      return;
    }

    this.isMatchingJob.set(true);
    this.jobMatchError.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<JobMatchResult>(`${API_BASE}/api/match-job`, {
          resumeText,
          jobDescription: jobText,
        })
      );
      this.jobMatchResult.set(response);
    } catch (err) {
      console.error('Job match failed:', err);
      const msg = 'Could not check the match right now. Make sure the backend server is running, then try again.';
      this.jobMatchError.set(msg);
    } finally {
      this.isMatchingJob.set(false);
    }
  }

  closeJobMatch() {
    this.jobMatchResult.set(null);
    this.jobMatchError.set(null);
  }

  // ============================================================
  // COVER LETTER GENERATOR — resume (+ optional job description)
  // se AI ek professional cover letter likh deta hai
  // ============================================================
  isGeneratingCoverLetter = signal(false);
  coverLetterResult = signal<string | null>(null);
  coverLetterError = signal<string | null>(null);
  coverLetterCopied = signal(false);

  async generateCoverLetter() {
    const resumeText = this.buildResumeText().trim();

    if (resumeText.length < 50) {
      this.coverLetterError.set('Please fill in more resume details first (summary, experience, etc.).');
      this.coverLetterResult.set(null);
      return;
    }

    this.isGeneratingCoverLetter.set(true);
    this.coverLetterError.set(null);
    this.coverLetterCopied.set(false);

    try {
      // Agar "Match a job" box mein job description already likhi hui hai,
      // usay bhi bhej dete hain taake letter usi role k liye tailored ho
      const jobDescription = this.jobDescription().trim() || undefined;

      const response = await firstValueFrom(
        this.http.post<{ coverLetter: string }>(`${API_BASE}/api/generate-cover-letter`, {
          resumeText,
          jobDescription,
        })
      );
      this.coverLetterResult.set(response.coverLetter);
    } catch (err) {
      console.error('Cover letter generation failed:', err);
      const msg = 'Could not generate the cover letter right now. Make sure the backend server is running, then try again.';
      this.coverLetterError.set(msg);
    } finally {
      this.isGeneratingCoverLetter.set(false);
    }
  }

  async copyCoverLetter() {
    const text = this.coverLetterResult();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.coverLetterCopied.set(true);
      setTimeout(() => this.coverLetterCopied.set(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  closeCoverLetter() {
    this.coverLetterResult.set(null);
    this.coverLetterError.set(null);
  }

  // ============================================================
  // BULLET POINT IMPROVER — Experience k har entry k paas ek
  // "✨ Improve" button, weak lines ko AI professional bana deta hai
  // ============================================================
  improvingIndex = signal<number | null>(null);
  bulletImproveError = signal<string | null>(null);
  private bulletBackup: { index: number; text: string } | null = null;
  justImprovedIndex = signal<number | null>(null);

  async improveBullets(index: number) {
    const entry = this.formData.experience[index];
    const text = entry?.description?.trim();

    if (!text || text.length < 5) {
      this.bulletImproveError.set('Add a description first, then improve it.');
      return;
    }

    this.improvingIndex.set(index);
    this.bulletImproveError.set(null);
    this.justImprovedIndex.set(null);

    const context = [entry.role, entry.company].filter(Boolean).join(' at ');

    try {
      const response = await firstValueFrom(
        this.http.post<{ improved: string }>(`${API_BASE}/api/improve-bullets`, {
          text,
          context,
        })
      );

      // undo k liye backup rakhte hain
      this.bulletBackup = { index, text: entry.description };
      entry.description = response.improved;
      this.justImprovedIndex.set(index);
    } catch (err) {
      console.error('Bullet improve failed:', err);
      this.bulletImproveError.set(
        'Could not improve bullets right now. Make sure the backend server is running, then try again.'
      );
    } finally {
      this.improvingIndex.set(null);
    }
  }

  undoImproveBullets(index: number) {
    if (this.bulletBackup && this.bulletBackup.index === index) {
      this.formData.experience[index].description = this.bulletBackup.text;
      this.bulletBackup = null;
      this.justImprovedIndex.set(null);
    }
  }
}