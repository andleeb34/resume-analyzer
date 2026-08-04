import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

import { FooterComponent } from './components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent,  FooterComponent],
  template: `
    <app-navbar />
    <div class="page-wrap">
      <router-outlet />
    </div>
    <app-footer />
  `,
  styles: [`
    .page-wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px 24px 80px;
      min-height: 60vh;
    }
  `]
})
export class AppComponent {}