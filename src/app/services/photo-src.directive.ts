import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Directive({ selector: 'img[appPhotoSrc]' })
export class PhotoSrcDirective {
  appPhotoSrc = input.required<string>();
  private image = inject<ElementRef<HTMLImageElement>>(ElementRef);

  constructor() {
    effect((onCleanup) => {
      const image = this.image.nativeElement;
      const src = this.appPhotoSrc();
      if (!Capacitor.isNativePlatform()) {
        image.src = src;
        return;
      }

      // Native HTTP shares PHP session cookies; cross-site image tags do not.
      let disposed = false;
      let objectUrl: string | undefined;
      image.removeAttribute('src');
      onCleanup(() => {
        disposed = true;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      });

      void fetch(src, { signal: AbortSignal.timeout(15000) })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Could not load the photo.');
          }
          const blob = await response.blob();
          if (!disposed) {
            objectUrl = URL.createObjectURL(blob);
            image.src = objectUrl;
          }
        })
        .catch(() => {
          if (!disposed) {
            image.removeAttribute('src');
          }
        });
    });
  }
}
