import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { PhotoSrcDirective } from './photo-src.directive';

@Component({ template: '<img [appPhotoSrc]="src" alt="" />', imports: [PhotoSrcDirective] })
class PhotoHostComponent {
  src = '/photo-filter-backend/api/photos/1/image';
}

describe('PhotoSrcDirective', () => {
  const createObjectURL = vi.fn(() => 'blob:authenticated-photo');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = createObjectURL;
        static override revokeObjectURL = revokeObjectURL;
      },
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('uses the normal image URL in a browser', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(PhotoHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(fixture.componentInstance.src);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads native images through authenticated fetch and releases the blob on destruction', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const image = new Blob(['image']);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => image });
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(PhotoHostComponent);
    fixture.detectChanges();

    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(image));
    expect(fetchMock).toHaveBeenCalledWith(
      fixture.componentInstance.src,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fixture.nativeElement.querySelector('img').src).toBe('blob:authenticated-photo');
    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-photo');
  });

  it('does not keep an image that finishes loading after its view was destroyed', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    let finish!: (response: { ok: boolean; blob: () => Promise<Blob> }) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const fixture = TestBed.createComponent(PhotoHostComponent);
    fixture.detectChanges();
    fixture.destroy();

    const blob = vi.fn(async () => new Blob(['image']));
    finish({ ok: true, blob });
    await vi.waitFor(() => expect(blob).toHaveBeenCalled());
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
