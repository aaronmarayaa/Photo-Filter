import type { OnDestroy } from '@angular/core';
import { Component, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

import { addPhoto } from '../services/photos-api';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar],
})
export class HomePage implements OnDestroy {
  cameraState = signal<'closed' | 'opening' | 'open'>('closed');
  cameraError = signal('');
  photoSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private cameraStream?: MediaStream; // for tracking using camera
  private faceLandmarker?: FaceLandmarker; // for tracking facial features
  private animationFrame = 0;
  private cameraRequest = 0;

  async toggleCamera(video: HTMLVideoElement, dogEars: HTMLImageElement, dogNose: HTMLImageElement): Promise<void> {
    if (this.cameraState() === 'open') { // close the camera
      this.closeCamera();
      video.srcObject = null;
      return;
    }

    const request = ++this.cameraRequest;
    this.cameraState.set('opening'); // set the camera state to opening
    this.cameraError.set('');
    dogEars.hidden = true;
    dogNose.hidden = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      }); // ask for camera access

      if (request !== this.cameraRequest) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      } // if the camera is application is closed while initializing, stop the tracking

      this.cameraStream = stream; // else, it will give the camera access
      video.srcObject = stream;
      await video.play();

      const [vision] = await Promise.all([
        FilesetResolver.forVisionTasks('assets/mediapipe'), // load the mediapipe vision files
        dogEars.decode(),
        dogNose.decode(),
      ]);
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'assets/face_landmarker.task' },
        runningMode: 'VIDEO',
        numFaces: 1,
      }); // create a face landmarker to track the facial features

      if (request !== this.cameraRequest) {
        faceLandmarker.close();
        return;
      }

      this.faceLandmarker = faceLandmarker; // set the face landmarker to the created one
      this.cameraState.set('open');
      this.trackFace(video, dogEars, dogNose, faceLandmarker); //  track the face
    } catch {
      if (request !== this.cameraRequest) {
        return;
      }
      this.closeCamera();
      video.srcObject = null;
      this.cameraError.set('Could not start the camera or load the dog filter.');
    }
  }

  async capturePhoto(video: HTMLVideoElement, dogEars: HTMLImageElement, dogNose: HTMLImageElement): Promise<void> {
    if (this.photoSaveState() === 'saving') {
      return;
    }

    this.photoSaveState.set('saving');

    try {
      const canvas = this.renderPhoto(video, [dogEars, dogNose]);
      await addPhoto(canvas);
      this.photoSaveState.set('saved');
    } catch {
      this.photoSaveState.set('error');
    }
  }

  ionViewWillLeave(): void {
    this.closeCamera();
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  private renderPhoto(video: HTMLVideoElement, overlays: HTMLImageElement[]): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context || !canvas.width || !canvas.height || !video.clientWidth || !video.clientHeight) {
      throw new Error('The camera frame is unavailable.');
    }

    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);

    context.scale(canvas.width / video.clientWidth, canvas.height / video.clientHeight);

    for (const image of overlays) {
      if (!image.hidden) {
        const imageStyle = getComputedStyle(image);
        const origin = imageStyle.transformOrigin.split(' ');
        const originX = parseFloat(origin[0]);
        const originY = parseFloat(origin[1]);
        const imageX = parseFloat(imageStyle.left);
        const imageY = parseFloat(imageStyle.top);
        const angle = parseFloat(image.style.rotate);
        const imageWidth = parseFloat(imageStyle.width);
        const imageHeight = parseFloat(imageStyle.height);

        context.save();
        context.translate(imageX, imageY);
        context.rotate(angle);
        context.drawImage(image, -originX, -originY, imageWidth, imageHeight);
        context.restore();
      }
    }

    return canvas;
  }

  private closeCamera() {
    this.cameraRequest++;
    cancelAnimationFrame(this.animationFrame);

    for (const track of this.cameraStream?.getTracks() ?? []) {
      track.stop();
    }

    this.faceLandmarker?.close();
    this.cameraStream = undefined;
    this.faceLandmarker = undefined;
    this.cameraState.set('closed');
  }

  private trackFace(
    video: HTMLVideoElement,
    dogEars: HTMLImageElement,
    dogNose: HTMLImageElement,
    faceLandmarker: FaceLandmarker,
  ) {
    let lastVideoTime = -1;

    const updateFrame = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const result = faceLandmarker.detectForVideo(video, performance.now()); // detect the face
        const face = result.faceLandmarks[0];

        if (face) {
          this.positionDogFilter(video, face, dogEars, dogNose); // position the dog filter on the face
        }

        dogEars.hidden = !face;
        dogNose.hidden = !face;
      }

      this.animationFrame = requestAnimationFrame(updateFrame);
    };

    this.animationFrame = requestAnimationFrame(updateFrame);
  }

  private positionDogFilter(
    video: HTMLVideoElement,
    face: NormalizedLandmark[],
    dogEars: HTMLImageElement,
    dogNose: HTMLImageElement,
  ) {
    const width = video.clientWidth;
    const height = video.clientHeight;
    const leftEye = face[33];
    const rightEye = face[263];
    const forehead = face[10];
    const nose = face[1];

    const eyeDistanceX = (rightEye.x - leftEye.x) * width;
    const eyeDistanceY = (rightEye.y - leftEye.y) * height;
    const faceSize = Math.hypot(eyeDistanceX, eyeDistanceY);
    const headAngle = `${Math.atan2(eyeDistanceY, eyeDistanceX)}rad`;

    dogEars.style.left = `${forehead.x * width}px`;
    dogEars.style.top = `${forehead.y * height}px`;
    dogEars.style.width = `${faceSize * 2.2}px`;
    dogEars.style.rotate = headAngle;

    dogNose.style.left = `${nose.x * width}px`;
    dogNose.style.top = `${nose.y * height}px`;
    dogNose.style.width = `${faceSize * 0.9}px`;
    dogNose.style.rotate = headAngle;
  }
}
