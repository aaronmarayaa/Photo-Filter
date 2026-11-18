import type { ElementRef, OnDestroy } from '@angular/core';
import { Component, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { addIcons } from 'ionicons';
import { cameraOutline, cameraReverseOutline, imagesOutline } from 'ionicons/icons';

import { addPhoto } from '../services/photos-api';

import { DogFilter } from './dog-filter';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [RouterLink, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar],
})
export class HomePage implements OnDestroy {
  cameraState = signal<'closed' | 'opening' | 'open'>('closed');
  cameraError = signal('');
  photoSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private earsRef = viewChild.required<ElementRef<HTMLImageElement>>('dogEars');
  private noseRef = viewChild.required<ElementRef<HTMLImageElement>>('dogNose');
  private cameraStream?: MediaStream;
  private dogFilter?: DogFilter;
  private cameraSession = 0;

  constructor() {
    addIcons({ cameraOutline, cameraReverseOutline, imagesOutline });
  }

  ionViewDidEnter(): void {
    void this.openCamera();
  }

  ionViewWillLeave(): void {
    this.closeCamera();
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  async openCamera(): Promise<void> {
    if (this.cameraState() !== 'closed') {
      return;
    }

    const session = this.cameraSession;
    const video = this.videoRef().nativeElement;
    const ears = this.earsRef().nativeElement;
    const nose = this.noseRef().nativeElement;
    this.cameraState.set('opening');
    this.cameraError.set('');
    ears.hidden = true;
    nose.hidden = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (session !== this.cameraSession) {
        this.stopStream(stream);
        return;
      }

      this.cameraStream = stream;
      video.srcObject = stream;
      await video.play();
      await ears.decode();
      await nose.decode();
      const vision = await FilesetResolver.forVisionTasks('assets/mediapipe');
      if (session !== this.cameraSession) {
        return;
      }

      const tracker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'assets/face_landmarker.task' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      if (session !== this.cameraSession) {
        tracker.close();
        return;
      }

      this.dogFilter = new DogFilter(video, ears, nose, tracker);
      this.dogFilter.start();
      this.cameraState.set('open');
    } catch (error) {
      if (session !== this.cameraSession) {
        return;
      }
      this.closeCamera();
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.cameraError.set('Allow camera access in your browser to take a photo.');
      } else {
        this.cameraError.set('Could not start the camera or load the dog filter.');
      }
    }
  }

  async capturePhoto(): Promise<void> {
    if (!this.dogFilter || this.photoSaveState() === 'saving') {
      return;
    }

    this.photoSaveState.set('saving');
    try {
      const photo = this.dogFilter.capture();
      await addPhoto(photo);
      this.photoSaveState.set('saved');
    } catch {
      this.photoSaveState.set('error');
    }
  }

  private stopStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  private closeCamera(): void {
    this.cameraSession++;
    if (this.cameraStream) {
      this.stopStream(this.cameraStream);
      this.cameraStream = undefined;
      this.videoRef().nativeElement.srcObject = null;
    }
    if (this.dogFilter) {
      this.dogFilter.stop();
      this.dogFilter = undefined;
    }
    this.cameraState.set('closed');
  }
}
