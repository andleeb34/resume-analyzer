import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

// Point this at your backend proxy (see backend/server.js). Never call the
// Anthropic API directly from the browser with a real API key.
const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ResumeAnalyzerService {
  readonly result = signal<AnalysisResult | null>(null);
  readonly resumeText = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

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
  }
}
