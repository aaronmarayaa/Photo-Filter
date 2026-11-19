import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

import { submitCredentials } from '../../services/auth-api';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrl: 'register.page.scss',
  imports: [FormsModule, RouterLink, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar],
})
export class RegisterPage {
  username = '';
  password = '';
  confirmPassword = '';
  warning = signal('');
  submitting = signal(false);

  private router = inject(Router);

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  togglePassword(password: IonInput): void {
    if (password.type === 'password') {
      password.type = 'text';
    } else {
      password.type = 'password';
    }
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    const username = this.username.trim();
    if (!username) {
      this.warning.set('Enter a username.');
      return;
    }

    const passwordBytes = new TextEncoder().encode(this.password).length;
    if (passwordBytes < 8 || passwordBytes > 48) {
      this.warning.set(
        passwordBytes < 8
          ? 'Use a longer password.'
          : 'Use a shorter password. Some characters count as more than one.',
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.warning.set('Passwords do not match.');
      return;
    }

    this.warning.set('');
    this.submitting.set(true);

    try {
      const warning = await submitCredentials('users', username, this.password);
      if (warning) {
        this.warning.set(warning);
        return;
      }

      this.password = '';
      this.confirmPassword = '';
      await this.router.navigate(['/login'], { queryParams: { registered: '1' }, replaceUrl: true });
    } catch {
      this.warning.set('Couldn\'t reach the registration server. Try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
