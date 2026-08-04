import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error.set('');
    if (!this.name() || !this.email() || !this.password()) {
      this.error.set('Please fill in all fields.');
      return;
    }
    if (this.password().length < 6) {
      this.error.set('Password should be at least 6 characters.');
      return;
    }
    const result = this.auth.signup(this.name(), this.email(), this.password());
    if (!result.ok) {
      this.error.set(result.error ?? 'Something went wrong.');
      return;
    }
    this.router.navigate(['/analyze']);
  }
}
