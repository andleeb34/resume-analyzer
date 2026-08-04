import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AdminStats {
  totalUsers: number;
  totalAnalyses: number;
  totalJobMatches: number;
  totalCoverLetters: number;
  averageScore: number;
  scoreDistribution: { low: number; mid: number; good: number; great: number };
  templateUsage: Record<string, number>;
  recentActivity: { score: number; date: string }[];
}

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admindashboard.html',
  styleUrl: './admindashboard.scss',
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<AdminStats | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<AdminStats>(`${API_BASE}/api/admin/stats`)
      );
      this.stats.set(response);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      this.error.set('Could not load dashboard data. Make sure the backend server is running.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // template usage ko ek array mein convert karta hai, sorted by count desc
  get templateUsageList(): { name: string; count: number; pct: number }[] {
    const data = this.stats()?.templateUsage ?? {};
    const entries = Object.entries(data).map(([name, count]) => ({ name, count }));
    const max = Math.max(1, ...entries.map((e) => e.count));
    return entries
      .sort((a, b) => b.count - a.count)
      .map((e) => ({ ...e, pct: Math.round((e.count / max) * 100) }));
  }

  get distributionList(): { label: string; count: number; pct: number }[] {
    const d = this.stats()?.scoreDistribution ?? { low: 0, mid: 0, good: 0, great: 0 };
    const max = Math.max(1, d.low, d.mid, d.good, d.great);
    return [
      { label: '0–40', count: d.low, pct: Math.round((d.low / max) * 100) },
      { label: '40–60', count: d.mid, pct: Math.round((d.mid / max) * 100) },
      { label: '60–80', count: d.good, pct: Math.round((d.good / max) * 100) },
      { label: '80–100', count: d.great, pct: Math.round((d.great / max) * 100) },
    ];
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
}