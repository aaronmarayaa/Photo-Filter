import type { OnDestroy } from '@angular/core';
import { Component, signal } from '@angular/core';
import { IonButton, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonButton, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage implements OnDestroy {
  cameraState = signal<'closed' | 'opening' | 'open'>('closed');
  cameraError = signal('');

  private cameraStream?: MediaStream; // for tracking using camera
  private faceLandmarker?: FaceLandmarker; // for tracking facial features
  private animationFrame = 0;

  async toggleCamera(video: HTMLVideoElement, dogEars: HTMLImageElement, dogNose: HTMLImageElement): Promise<void> {
    if (this.cameraState() === 'open') { // close the camera
      this.closeCamera();
      video.srcObject = null;
      return;
    }

    this.cameraState.set('opening'); // set the camera state to opening
    this.cameraError.set('');
    dogEars.hidden = true;
    dogNose.hidden = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      }); // ask for camera access

      if (this.cameraState() === 'closed') {
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

      if (this.cameraState() === 'closed') {
        faceLandmarker.close();
        return;
      }

      this.faceLandmarker = faceLandmarker; // set the face landmarker to the created one
      this.cameraState.set('open');
      this.trackFace(video, dogEars, dogNose, faceLandmarker); //  track the face
    } catch {
      this.closeCamera();
      video.srcObject = null;
      this.cameraError.set('Could not start the camera or load the dog filter.');
    }
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  private closeCamera() {
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
