import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';

import type { Photo } from '../../services/photos-api';
import { deletePhoto, getPhotoImage, listPhotos } from '../../services/photos-api';

@Component({
  selector: 'app-photos',
  templateUrl: 'photos.page.html',
  styleUrl: 'photos.page.scss',
  imports: [DatePipe, IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar],
})
export class PhotosPage {
  photos = signal<Photo[]>([]);
  loading = signal(false);
  loadError = signal(false);
  actionError = signal('');
  working = signal(false);

  ionViewWillEnter(): void {
    void this.loadPhotos();
  }

  async loadPhotos(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.actionError.set('');
    try {
      const photos = await listPhotos();
      this.photos.set(photos);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  photoName(id: number): string {
    return `photo-${id}.png`;
  }

  async savePhoto(photo: Photo): Promise<void> {
    this.working.set(true);
    this.actionError.set('');
    try {
      const image = await getPhotoImage(photo.id);
      const url = URL.createObjectURL(image);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.photoName(photo.id);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.actionError.set('Couldn’t download the photo. Try again.');
    } finally {
      this.working.set(false);
    }
  }

  async removePhoto(photo: Photo): Promise<void> {
    if (!window.confirm(`Delete ${this.photoName(photo.id)}?`)) {
      return;
    }

    this.working.set(true);
    this.actionError.set('');
    try {
      await deletePhoto(photo.id);
      const remainingPhotos = this.photos().filter((item) => item.id !== photo.id);
      this.photos.set(remainingPhotos);
    } catch {
      this.actionError.set('Couldn’t delete the photo. Try again.');
    } finally {
      this.working.set(false);
    }
  }
}
