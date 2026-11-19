import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular';

import { getBackendUrl, serverStorageKey } from '../../services/api-url';
import { normalizeBackendUrl } from '../../services/backend-url';

@Component({
  selector: 'app-server',
  imports: [FormsModule, IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Backend address</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form (ngSubmit)="save()">
        <p>Enter the HTTPS address of your PHP API, including /photo-filter-backend/api.</p>
        <ion-input
          type="url"
          name="address"
          label="Backend URL"
          labelPlacement="stacked"
          fill="outline"
          autocapitalize="off"
          [(ngModel)]="address"
          required
        ></ion-input>
        @if (invalid()) {
          <p role="alert">Enter a valid HTTPS address that your phone can reach.</p>
        }
        <ion-button type="submit">Continue to login</ion-button>
      </form>
    </ion-content>
  `,
})
export class ServerPage {
  address = getBackendUrl();
  invalid = signal(false);
  private router = inject(Router);

  save(): void {
    let url: string;
    try {
      url = normalizeBackendUrl(this.address);
    } catch {
      this.invalid.set(true);
      return;
    }
    localStorage.setItem(serverStorageKey, url);
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
