import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ResumeAnalyzerService } from '../../services/resume-analyzer.service';

type Mode = 'paste' | 'file';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  mode = signal<Mode>('paste');
  pastedText = signal<string>('');
  fileName = signal<string>('');
  fileText = signal<string>('');
  isDragOver = signal<boolean>(false);
  localError = signal<string>('');

  constructor(
    private analyzer: ResumeAnalyzerService,
    private router: Router
  ) {}

  get charCount(): number {
    return this.currentText().length;
  }

  get canAnalyze(): boolean {
    return this.currentText().trim().length >= 50 && !this.analyzer.isLoading();
  }

  get isLoading(): boolean {
    return this.analyzer.isLoading();
  }

  get errorMessage(): string {
    return this.localError() || this.analyzer.error() || '';
  }

  currentText(): string {
    return this.mode() === 'paste' ? this.pastedText() : this.fileText();
  }

  setMode(m: Mode): void {
    this.mode.set(m);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  async handleFile(file: File): Promise<void> {
    this.localError.set('');
    this.fileName.set(`Reading ${file.name}...`);
    try {
      let text: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await this.analyzer.extractPdfText(file);
      } else {
        text = await file.text();
      }
      this.fileText.set(text);
      this.fileName.set(`${file.name} — ${text.length} characters extracted`);
    } catch (err) {
      console.error(err);
      this.fileName.set('Could not read that file');
      this.localError.set('Could not extract text from that file. Try a .txt file or paste the text instead.');
    }
  }

  async onAnalyze(): Promise<void> {
    const text = this.currentText().trim();
    if (text.length < 50) {
      this.localError.set('Add a bit more text — that looks too short to be a full resume.');
      return;
    }
    this.localError.set('');
    this.analyzer.setResumeText(text);
    const ok = await this.analyzer.analyze();
    if (ok) {
      this.router.navigate(['/results']);
    }
  }

  onEditText(value: string): void {
    if (this.mode() === 'paste') {
      this.pastedText.set(value);
    } else {
      this.fileText.set(value);
    }
  }

  get canDownload(): boolean {
    return this.currentText().trim().length > 0;
  }

  downloadResume(): void {
    if (!this.canDownload) return;
    window.print();
  }
}
