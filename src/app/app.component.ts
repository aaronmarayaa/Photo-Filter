import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { logout, signedIn } from './services/auth-api';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonRouterOutlet,
    IonSplitPane,
    IonTitle,
    IonToolbar,
  ],
})
export class AppComponent {
  signedIn = signedIn;
  loggingOut = signal(false);

  private router = inject(Router);

  async logOut(): Promise<void> {
    this.loggingOut.set(true);

    try {
      await logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch {
      window.alert('Couldn’t log out. Try again.');
    } finally {
      this.loggingOut.set(false);
    }
  }
}
