import { inject } from '@angular/core';
import { Router, type Routes, type UrlTree } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { chooseServerOnPhone, getBackendUrl } from './services/api-url';
import { signedIn } from './services/auth-api';

const appPages: Routes = [
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
];

function allowServerSetup(): boolean | UrlTree {
  if (chooseServerOnPhone && !signedIn()) {
    return true;
  }
  return inject(Router).parseUrl('/home');
}

function requireBackendUrl(): boolean | UrlTree {
  if (getBackendUrl()) {
    return true;
  }
  return inject(Router).parseUrl('/server');
}

export const routes: Routes = [
  {
    path: 'server',
    canActivate: [allowServerSetup],
    loadComponent: () => import('./pages/server/server.page').then((m) => m.ServerPage),
  },
  {
    path: '',
    canActivateChild: [requireBackendUrl],
    children: appPages,
  },
];
