import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error.set('');
    if (!this.email() || !this.password()) {
      this.error.set('Please fill in both fields.');
      return;
    }
    const result = this.auth.login(this.email(), this.password());
    if (!result.ok) {
      this.error.set(result.error ?? 'Something went wrong.');
      return;
    }
    this.router.navigate(['/analyze']);
  }
}
