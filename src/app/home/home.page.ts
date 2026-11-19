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
    if (this.cameraState() === 'opening' || (this.cameraState() === 'open' && !switchTo)) {
      return;
    }

    const session = this.cameraSession;
    const video = this.videoRef().nativeElement;
    const ears = this.earsRef().nativeElement;
    const nose = this.noseRef().nativeElement;
    const frog = this.frogRef().nativeElement;
    const previousDevice = this.cameraStream?.getVideoTracks()[0]?.getSettings().deviceId;
    let facing = switchTo ?? this.cameraFacing();
    this.cameraState.set('opening');
    this.cameraError.set('');
    this.releaseCameraStream();
    ears.hidden = true;
    nose.hidden = true;
    frog.hidden = true;

    try {
      let stream: MediaStream;
      try {
        stream = await this.requestStream(switchTo ? { exact: switchTo } : facing);
      } catch (error) {
        if (
          !switchTo ||
          session !== this.cameraSession ||
          (error instanceof DOMException && error.name === 'NotAllowedError')
        ) {
          throw error;
        }
        facing = this.cameraFacing();
        stream = await this.requestStream(facing);
      }
      if (session !== this.cameraSession) {
        this.stopStream(stream);
        return;
      }

      this.cameraStream = stream;
      const settings = stream.getVideoTracks()[0].getSettings();
      if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
        facing = settings.facingMode;
      } else if (previousDevice && previousDevice === settings.deviceId) {
        facing = this.cameraFacing();
      }
      this.cameraFacing.set(facing);
      video.srcObject = stream;
      await video.play();
      if (session !== this.cameraSession) {
        return;
      }
      if (!this.faceFilter) {
        await ears.decode();
        await nose.decode();
        await frog.decode();
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
        this.faceFilter = new FaceFilter(video, ears, nose, frog, tracker);
        this.faceFilter.start();
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
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.cameraError.set('Allow camera access in your browser to take a photo.');
      } else {
        this.cameraError.set('Could not start the camera or load the filters.');
      }
    }
  }

  async capturePhoto(): Promise<void> {
    if (!this.faceFilter || this.cameraState() !== 'open' || this.photoSaveState() === 'saving') {
      return;
    }

    this.photoSaveState.set('saving');
    try {
      const photo = this.faceFilter.capture(this.selectedFilter(), this.cameraFacing() === 'user');
      await addPhoto(photo);
      this.photoSaveState.set('saved');
    } catch {
      this.photoSaveState.set('error');
    }
  }

  private requestStream(facingMode: ConstrainDOMString): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
    });
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
    if (this.faceFilter) {
      this.faceFilter.stop();
      this.faceFilter = undefined;
    }
    this.cameraState.set('closed');
  }
}
