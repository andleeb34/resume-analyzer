import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'analyze',
    loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent)
  },
  
  {
    path: 'examples',
    loadComponent: () => import('./pages/examples/examples.component').then(m => m.ExamplesComponent)
  },
  {
    path: 'results',
    loadComponent: () => import('./pages/results/results.component').then(m => m.ResultsComponent)
  },
  
 
{
  path: 'resume-templates',
  loadComponent: () =>
    import('./pages/resume-templates/resume-templates')
      .then(m => m.ResumeTemplatesComponent)
},
{
  path: 'admindashboard',
  loadComponent: () =>
    import('./admindashboard/admindashboard').then(m => m.AdminDashboardComponent)
}

]