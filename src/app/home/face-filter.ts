import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FilterName = 'dog' | 'frog';

export class FaceFilter {
  private trackingTimer = 0;

  constructor(
    private video: HTMLVideoElement,
    private ears: HTMLImageElement,
    private nose: HTMLImageElement,
    private frog: HTMLImageElement,
    private tracker: FaceLandmarker,
  ) {}

  start(): void {
    const stickers = [this.ears, this.nose, this.frog];
    this.trackingTimer = window.setInterval(() => {
      if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const { faceLandmarks } = this.tracker.detectForVideo(this.video, performance.now());
      const face = faceLandmarks[0];
      for (const sticker of stickers) {
        sticker.hidden = !face;
      }
      if (face) {
        this.positionImages(face);
      }
    }, 40);
  } // this part finds the face and positions the images on the face

  stop(): void {
    window.clearInterval(this.trackingTimer);
    this.tracker.close();
  }

  capture(filter: FilterName, mirror: boolean): HTMLCanvasElement {
    const video = this.video;
    const frame = this.getVideoBounds();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.clientWidth / frame.scale);
    canvas.height = Math.round(video.clientHeight / frame.scale);
    const context = canvas.getContext('2d');
    if (!context || !canvas.width || !canvas.height) {
      throw new Error('The camera frame is unavailable.');
    }

    if (mirror) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.scale(canvas.width / video.clientWidth, canvas.height / video.clientHeight); // tracks the user's face and draws the filters on the canvas
    context.drawImage(video, frame.left, frame.top, frame.width, frame.height);
    const stickers = filter === 'frog' ? [this.frog] : [this.ears, this.nose];
    for (const sticker of stickers) {
      // draws the selected filter one by one
      this.drawImage(context, sticker);
    }
    return canvas;
  }

  private getVideoBounds() {
    const video = this.video;
    const scale = Math.max(video.clientWidth / video.videoWidth, video.clientHeight / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    const left = (video.clientWidth - width) / 2;
    const top = (video.clientHeight - height) / 2;
    return { scale, width, height, left, top };
  }

  private positionImages(face: NormalizedLandmark[]): void {
    const frame = this.getVideoBounds();
    const leftEye = face[33];
    const rightEye = face[263];
    const forehead = face[10];
    const noseTip = face[1];
    const eyeDistanceX = (rightEye.x - leftEye.x) * frame.width;
    const eyeDistanceY = (rightEye.y - leftEye.y) * frame.height;
    const faceSize = Math.hypot(eyeDistanceX, eyeDistanceY);
    const headAngle = Math.atan2(eyeDistanceY, eyeDistanceX);

    function placeImage(image: HTMLImageElement, point: NormalizedLandmark, width: number) {
      image.style.left = `${frame.left + point.x * frame.width}px`;
      image.style.top = `${frame.top + point.y * frame.height}px`;
      image.style.width = `${width}px`;
      image.style.rotate = `${headAngle}rad`;
    }

    placeImage(this.ears, forehead, faceSize * 2.2);
    placeImage(this.nose, noseTip, faceSize * 0.9);
    placeImage(this.frog, forehead, faceSize * 1.6);
  }

  // placing the filter/sticker
  private drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement): void {
    if (image.hidden) {
      return;
    }
    const { left, top, width, height, transformOrigin } = getComputedStyle(image);
    const [originX, originY] = transformOrigin.split(' ').map(parseFloat);

    context.save();
    context.translate(parseFloat(left), parseFloat(top));
    context.rotate(parseFloat(image.style.rotate));
    context.drawImage(image, -originX, -originY, parseFloat(width), parseFloat(height));
    context.restore();
  }
}
