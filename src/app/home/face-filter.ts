import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FilterName = 'dog' | 'frog';

export class FaceFilter {
  private animationFrame = 0;

  constructor(
    private video: HTMLVideoElement,
    private ears: HTMLImageElement,
    private nose: HTMLImageElement,
    private frog: HTMLImageElement,
    private tracker: FaceLandmarker,
  ) {}

  start(): void {
    let lastVideoTime = -1;
    const update = () => {
      if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.currentTime !== lastVideoTime) {
        lastVideoTime = this.video.currentTime;
        const result = this.tracker.detectForVideo(this.video, performance.now());
        const face = result.faceLandmarks[0];

        this.ears.hidden = !face;
        this.nose.hidden = !face;
        this.frog.hidden = !face;
        if (face) {
          this.positionImages(face);
        }
      }
      this.animationFrame = requestAnimationFrame(update);
    };

    this.animationFrame = requestAnimationFrame(update);
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrame);
    this.tracker.close();
  }

  capture(filter: FilterName): HTMLCanvasElement {
    const video = this.video;
    if (!video.videoWidth || !video.videoHeight || !video.clientWidth || !video.clientHeight) {
      throw new Error('The camera frame is unavailable.');
    }

    const frame = this.getVideoBounds();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.clientWidth / frame.scale);
    canvas.height = Math.round(video.clientHeight / frame.scale);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('The camera frame is unavailable.');
    }

    context.translate(canvas.width, 0);
    context.scale(-canvas.width / video.clientWidth, canvas.height / video.clientHeight);
    context.drawImage(video, frame.left, frame.top, frame.width, frame.height);
    if (filter === 'frog') {
      this.drawImage(context, this.frog);
    } else {
      this.drawImage(context, this.ears);
      this.drawImage(context, this.nose);
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

  private drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement): void {
    if (image.hidden) {
      return;
    }
    const style = getComputedStyle(image);
    const origin = style.transformOrigin.split(' ');
    const originX = parseFloat(origin[0]);
    const originY = parseFloat(origin[1]);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);

    context.save();
    context.translate(parseFloat(style.left), parseFloat(style.top));
    context.rotate(parseFloat(image.style.rotate));
    context.drawImage(image, -originX, -originY, width, height);
    context.restore();
  }
}
