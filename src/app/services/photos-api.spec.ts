import { addPhoto, getPhotoImage, listPhotos } from './photos-api';

describe('photo uploads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function canvasWith(photo: Blob | null): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => callback(photo));
    return canvas;
  }

  it('sends the captured PNG as a file supported by Capacitor native multipart uploads', async () => {
    const photo = new Blob(['captured PNG bytes'], { type: 'image/png' });
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetch);

    await addPhoto(canvasWith(photo));

    const [url, options] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/photo-filter-backend/api/photos');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    const file = (options.body as FormData).get('photo');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('photo.png');
    expect((file as File).type).toBe('image/png');
    const contents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file as File);
    });
    expect(contents).toBe('captured PNG bytes');
  });

  it('reports upload validation errors and lets the gallery load after a failed capture', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Photos must be 10 MiB or smaller.' }), { status: 413 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ photos: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await expect(addPhoto(canvasWith(new Blob(['image'], { type: 'image/png' })))).rejects.toThrow(
      'Photos must be 10 MiB or smaller.',
    );
    await expect(listPhotos()).resolves.toEqual([]);
  });

  it('does not send a request when the canvas cannot encode a photo', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(addPhoto(canvasWith(null))).rejects.toThrow('Could not encode the photo.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports the HTTP failure when the tunnel returns HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>', { status: 502 })));

    await expect(addPhoto(canvasWith(new Blob(['image'], { type: 'image/png' })))).rejects.toThrow(
      'Could not upload the photo (HTTP 502).',
    );
  });

  it('shows a session failure when a download is no longer authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Log in first.' }), { status: 401 })),
    );

    await expect(getPhotoImage(1)).rejects.toThrow('Log in first.');
  });
});
