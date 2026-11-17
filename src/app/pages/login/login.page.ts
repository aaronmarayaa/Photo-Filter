import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular';

import { signedIn, submitCredentials } from '../../services/auth-api';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrl: 'login.page.scss',
  imports: [FormsModule, IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar],
})
export class LoginPage {
  username = '';
  password = '';
  warning = signal('');
  message = signal('');
  submitting = signal<'login' | 'users' | null>(null);

  private router = inject(Router);

  async submit(action: 'login' | 'users'): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.warning.set('');
    this.message.set('');
    this.submitting.set(action);

    try {
      const warning = await submitCredentials(action, this.username, this.password);
      if (warning) {
        this.warning.set(warning);
        return;
      }

      if (action === 'users') {
        this.message.set('Account created. Log in to continue.');
        return;
      }

      signedIn.set(true);
      this.password = '';
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch {
      this.warning.set('Couldn’t reach the login server. Try again.');
    } finally {
      this.submitting.set(null);
    }
  }
}
