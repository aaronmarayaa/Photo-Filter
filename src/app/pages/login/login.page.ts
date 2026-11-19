import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { map } from 'rxjs';

import { chooseServerOnPhone } from '../../services/api-url';
import { markSignedIn, submitCredentials } from '../../services/auth-api';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrl: 'login.page.scss',
  imports: [FormsModule, RouterLink, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar],
})
export class LoginPage {
  chooseServerOnPhone = chooseServerOnPhone;
  username = '';
  password = '';
  warning = signal('');
  submitting = signal(false);
  accountCreated = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('registered') === '1')),
  );

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

  ionViewWillEnter(): void {
    this.warning.set('');
    this.password = '';
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.warning.set('');
    this.submitting.set(true);

    try {
      const warning = await submitCredentials('login', this.username, this.password);
      if (warning) {
        this.warning.set(warning);
        return;
      }

      markSignedIn();
      this.password = '';
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch {
      this.warning.set('Couldn’t reach the login server. Try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
