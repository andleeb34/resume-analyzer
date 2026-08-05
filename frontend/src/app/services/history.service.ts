import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { AnalysisResult } from './resume-analyzer.service';

export interface SavedAnalysis {
  id: string;
  date: string; // ISO string
  overallScore: number;
  summary: string;
  resumeText: string;
  result: AnalysisResult;
}

const HISTORY_KEY_PREFIX = 'resumeiq_history_';
const MAX_SAVED = 30;

/*
  ============================================================
  HISTORY SERVICE — past resume analyses save karta hai
  ============================================================
  Har user (email k hisaab se) ki apni alag history hoti hai,
  localStorage mein. Agar koi login nahi hai, "guest" key use hoti hai.

  ResumeAnalyzerService.analyze() k successful hone par ye
  automatically ek entry save karta hai — koi extra call nahi karni padti.
  ============================================================
*/

@Injectable({ providedIn: 'root' })
export class HistoryService {
  readonly history = signal<SavedAnalysis[]>([]);

  constructor(private auth: AuthService) {
    this.reload();
  }

  private storageKey(): string {
    const email = this.auth.currentUser()?.email ?? 'guest';
    return HISTORY_KEY_PREFIX + email;
  }

  reload(): void {
    const raw = localStorage.getItem(this.storageKey());
    const list: SavedAnalysis[] = raw ? JSON.parse(raw) : [];
    // sabse naya sabse upar
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.history.set(list);
  }

  save(resumeText: string, result: AnalysisResult): void {
    const entry: SavedAnalysis = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      overallScore: result.overallScore,
      summary: result.summary,
      resumeText,
      result,
    };

    const current = [entry, ...this.history()].slice(0, MAX_SAVED);
    this.history.set(current);
    localStorage.setItem(this.storageKey(), JSON.stringify(current));
  }

  remove(id: string): void {
    const current = this.history().filter((h) => h.id !== id);
    this.history.set(current);
    localStorage.setItem(this.storageKey(), JSON.stringify(current));
  }

  clearAll(): void {
    this.history.set([]);
    localStorage.removeItem(this.storageKey());
  }
}