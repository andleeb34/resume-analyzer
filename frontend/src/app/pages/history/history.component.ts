import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HistoryService } from '../../services/history.service';
import { ResumeAnalyzerService } from '../../services/resume-analyzer.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent {
  constructor(
    public historyService: HistoryService,
    private analyzer: ResumeAnalyzerService,
    private router: Router
  ) {
    this.historyService.reload();
  }

  view(id: string): void {
    const item = this.historyService.history().find((h) => h.id === id);
    if (!item) return;
    this.analyzer.loadFromHistory(item.resumeText, item.result);
    this.router.navigate(['/results']);
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.historyService.remove(id);
  }

  clearAll(): void {
    this.historyService.clearAll();
  }

  snippet(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > 110 ? clean.slice(0, 110) + '…' : clean;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
}