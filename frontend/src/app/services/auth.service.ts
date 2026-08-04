import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  name: string;
  email: string;
}

interface StoredUser extends User {
  password: string;
}

// NOTE: This is a frontend-only demo auth for the project UI. It stores
// users in localStorage and is NOT secure (passwords aren't hashed, nothing
// is verified server-side). For a real app, replace this with real backend
// endpoints (e.g. on the Express server) that hash passwords and issue
// proper session/JWT tokens.
const USERS_KEY = 'resumeiq_users';
const SESSION_KEY = 'resumeiq_session';

// Backend proxy — admin dashboard k liye signup count yahan bheja jata hai
const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(this.loadSession());

  constructor(private http: HttpClient) {}

  private loadSession(): User | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private getUsers(): StoredUser[] {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveUsers(users: StoredUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  signup(name: string, email: string, password: string): { ok: boolean; error?: string } {
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    users.push({ name, email, password });
    this.saveUsers(users);
    this.setSession({ name, email });

    // Admin dashboard k liye fire-and-forget tracking call —
    // fail ho jaye to bhi signup process ko block nahi karta
    this.http.post(`${API_BASE}/api/track-signup`, {}).subscribe({
      error: (err) => console.warn('Signup tracking failed (non-blocking):', err),
    });

    return { ok: true };
  }

  login(email: string, password: string): { ok: boolean; error?: string } {
    const users = this.getUsers();
    const match = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!match) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    this.setSession({ name: match.name, email: match.email });
    return { ok: true };
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.currentUser.set(null);
  }

  private setSession(user: User): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }
}