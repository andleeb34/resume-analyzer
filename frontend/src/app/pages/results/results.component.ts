import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResumeAnalyzerService } from '../../services/resume-analyzer.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss'
})
export class ResultsComponent {
  constructor(
    public analyzer: ResumeAnalyzerService,
    private router: Router
  ) {
    // If someone lands here directly without an analysis, send them back.
    if (!this.analyzer.result()) {
      this.router.navigate(['/']);
    }
  }

  again(): void {
    this.analyzer.reset();
    this.router.navigate(['/']);
  }
}
