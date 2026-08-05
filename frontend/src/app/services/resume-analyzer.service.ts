import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HistoryService } from './history.service';

export interface Category {
  name: string;
  score: number;
  comment: string;
}

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  categories: Category[];
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

// Point this at your backend proxy (see backend/server.js). Never call the
// AI API directly from the browser with a real API key.
const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ResumeAnalyzerService {
  readonly result = signal<AnalysisResult | null>(null);
  readonly resumeText = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor(private http: HttpClient, private history: HistoryService) {}

  setResumeText(text: string): void {
    this.resumeText.set(text);
  }

  async extractPdfText(file: File): Promise<string> {
    // pdfjs-dist is loaded dynamically so it only ends up in the bundle
    // for users who actually upload a PDF.
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text.trim();
  }

  async analyze(): Promise<boolean> {
    const text = this.resumeText().trim();
    if (text.length < 50) {
      this.error.set('Add a bit more text — that looks too short to be a full resume.');
      return false;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AnalysisResult>(`${API_BASE}/api/analyze`, { resumeText: text })
      );
      this.result.set(response);
      this.history.save(text, response);
      return true;
    } catch (err) {
      console.error('Analyze failed:', err);
      this.error.set('Something went wrong while analyzing. Make sure the backend server is running, then try again.');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  reset(): void {
    this.result.set(null);
    this.resumeText.set('');
    this.error.set(null);
    this.jobDescription.set('');
    this.jobMatchResult.set(null);
    this.jobMatchError.set(null);
    this.showJobMatchBox.set(false);
    this.coverLetterResult.set(null);
    this.coverLetterError.set(null);
  }

  // History page se ek purana analysis wapas kholne k liye
  loadFromHistory(resumeText: string, result: AnalysisResult): void {
    this.resumeText.set(resumeText);
    this.result.set(result);
    this.jobDescription.set('');
    this.jobMatchResult.set(null);
    this.jobMatchError.set(null);
    this.showJobMatchBox.set(false);
    this.coverLetterResult.set(null);
    this.coverLetterError.set(null);
  }

  // ============================================================
  // JOB DESCRIPTION MATCH
  // ============================================================
  readonly showJobMatchBox = signal(false);
  readonly jobDescription = signal('');
  readonly isMatchingJob = signal(false);
  readonly jobMatchResult = signal<JobMatchResult | null>(null);
  readonly jobMatchError = signal<string | null>(null);

  toggleJobMatchBox(): void {
    this.showJobMatchBox.set(!this.showJobMatchBox());
  }

  async checkJobMatch(): Promise<void> {
    const resumeText = this.resumeText().trim();
    const jobText = this.jobDescription().trim();

    if (resumeText.length < 50) {
      this.jobMatchError.set('Please analyze a resume first.');
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
      this.jobMatchError.set(
        'Could not check the match right now. Make sure the backend server is running, then try again.'
      );
    } finally {
      this.isMatchingJob.set(false);
    }
  }

  closeJobMatch(): void {
    this.jobMatchResult.set(null);
    this.jobMatchError.set(null);
  }

  // ============================================================
  // COVER LETTER GENERATOR
  // ============================================================
  readonly isGeneratingCoverLetter = signal(false);
  readonly coverLetterResult = signal<string | null>(null);
  readonly coverLetterError = signal<string | null>(null);
  readonly coverLetterCopied = signal(false);

  async generateCoverLetter(): Promise<void> {
    const resumeText = this.resumeText().trim();

    if (resumeText.length < 50) {
      this.coverLetterError.set('Please analyze a resume first.');
      this.coverLetterResult.set(null);
      return;
    }

    this.isGeneratingCoverLetter.set(true);
    this.coverLetterError.set(null);
    this.coverLetterCopied.set(false);

    try {
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
      this.coverLetterError.set(
        'Could not generate the cover letter right now. Make sure the backend server is running, then try again.'
      );
    } finally {
      this.isGeneratingCoverLetter.set(false);
    }
  }

  async copyCoverLetter(): Promise<void> {
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

  closeCoverLetter(): void {
    this.coverLetterResult.set(null);
    this.coverLetterError.set(null);
  }
}