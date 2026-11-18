import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { map } from 'rxjs';

import { markSignedIn, submitCredentials } from '../../services/auth-api';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrl: 'login.page.scss',
  imports: [FormsModule, RouterLink, IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar],
})
export class LoginPage {
  username = '';
  password = '';
  warning = signal('');
  submitting = signal(false);
  accountCreated = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('registered') === '1')),
  );

  private router = inject(Router);

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
