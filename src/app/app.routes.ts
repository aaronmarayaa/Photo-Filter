import type { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'photos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/photos/photos.page').then((m) => m.PhotosPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'photo',
    redirectTo: 'photos',
    pathMatch: 'full',
  },
  {
    path: 'server',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
