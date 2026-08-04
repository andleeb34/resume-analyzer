import { Injectable, signal, effect } from '@angular/core';

const THEME_KEY = 'resumeiq_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(this.loadInitial());

  constructor() {
    // Jab bhi isDark badle, <body> pe class lagao/hatao aur localStorage mein save karo
    effect(() => {
      const dark = this.isDark();
      document.body.classList.toggle('dark-theme', dark);
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  private loadInitial(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    // Agar pehle se koi preference save nahi hai, to system preference use karo
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }
}