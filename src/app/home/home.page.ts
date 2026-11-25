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

import type { FilterName } from './face-filter';
import { FaceFilter } from './face-filter';

type CameraFacing = 'user' | 'environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [RouterLink, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar],
})
export class HomePage implements OnDestroy {
  selectedFilter = signal<FilterName>('dog');
  cameraState = signal<'closed' | 'opening' | 'open'>('closed');
  cameraFacing = signal<CameraFacing>('user');
  cameraError = signal('');
  photoSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  photoSaveError = signal('');

  private videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private earsRef = viewChild.required<ElementRef<HTMLImageElement>>('dogEars');
  private noseRef = viewChild.required<ElementRef<HTMLImageElement>>('dogNose');
  private frogRef = viewChild.required<ElementRef<HTMLImageElement>>('frog');
  private cameraStream?: MediaStream;
  private faceFilter?: FaceFilter;
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

  reverseCamera(): void {
    if (this.cameraState() !== 'open') {
      return;
    }
    const otherCamera = this.cameraFacing() === 'user' ? 'environment' : 'user';
    void this.openCamera(otherCamera);
  }

  async openCamera(switchTo?: CameraFacing): Promise<void> {
    const state = this.cameraState();
    if (state === 'opening' || (state === 'open' && !switchTo)) {
      return;
    }

    const session = this.cameraSession;
    const video = this.videoRef().nativeElement;
    const stickers = [
      this.earsRef().nativeElement,
      this.noseRef().nativeElement,
      this.frogRef().nativeElement,
    ] as const;
    const previousFacing = this.cameraFacing();
    const previousDeviceId = this.cameraStream?.getVideoTracks()[0]?.getSettings().deviceId;
    const preferredFacing = switchTo ?? previousFacing;

    this.cameraState.set('opening');
    this.cameraError.set('');
    this.releaseCameraStream();
    for (const sticker of stickers) {
      sticker.hidden = true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: preferredFacing }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (session !== this.cameraSession) {
        this.stopStream(stream);
        return;
      }

      this.cameraStream = stream;
      const { facingMode, deviceId } = stream.getVideoTracks()[0].getSettings();
      const fallbackFacing = deviceId && deviceId === previousDeviceId ? previousFacing : preferredFacing;
      const facing = facingMode === 'user' || facingMode === 'environment' ? facingMode : fallbackFacing;
      this.cameraFacing.set(facing);

      video.srcObject = stream;
      await video.play();
      await this.startFaceFilter(video, stickers, session);
      if (session !== this.cameraSession) {
        return;
      }

      this.cameraState.set('open');
      if (switchTo && facing !== switchTo) {
        this.cameraError.set('The other camera is unavailable on this device.');
      }
    } catch (error) {
      if (session !== this.cameraSession) {
        return;
      }
      this.closeCamera();
      this.cameraError.set(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Allow camera access in your browser to take a photo.'
          : 'Could not start the camera or load the filters.',
      );
    }
  }

  async capturePhoto(): Promise<void> {
    if (!this.faceFilter || this.cameraState() !== 'open' || this.photoSaveState() === 'saving') {
      return;
    }

    this.photoSaveState.set('saving');
    this.photoSaveError.set('');
    try {
      const photo = this.faceFilter.capture(this.selectedFilter(), this.cameraFacing() === 'user');
      await addPhoto(photo);
      this.photoSaveState.set('saved');
    } catch (error) {
      this.photoSaveError.set(
        error instanceof Error ? error.message : 'Could not add the photo to the list. Try again.',
      );
      this.photoSaveState.set('error');
    }
  }

  private async startFaceFilter(
    video: HTMLVideoElement,
    stickers: readonly [ears: HTMLImageElement, nose: HTMLImageElement, frog: HTMLImageElement],
    session: number,
  ): Promise<void> {
    if (this.faceFilter || session !== this.cameraSession) {
      return;
    }

    const [vision] = await Promise.all([
      FilesetResolver.forVisionTasks('assets/mediapipe'),
      ...stickers.map((sticker) => sticker.decode()),
    ]);
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

    this.faceFilter = new FaceFilter(video, ...stickers, tracker);
    this.faceFilter.start();
  }

  private stopStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  private releaseCameraStream(): void {
    if (this.cameraStream) {
      this.stopStream(this.cameraStream);
      this.cameraStream = undefined;
      this.videoRef().nativeElement.srcObject = null;
    }
  }

  private closeCamera(): void {
    this.cameraSession++;
    this.releaseCameraStream();
    this.faceFilter?.stop();
    this.faceFilter = undefined;
    this.cameraState.set('closed');
  }
}
