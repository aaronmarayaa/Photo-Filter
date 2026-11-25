import { apiUrl } from './api-url';

export interface Photo {
  id: number;
  createdAt: string;
}

let pendingUpload = Promise.resolve();

async function photoRequestError(response: Response, fallback: string): Promise<Error> {
  try {
    const result: { message?: string } = await response.json();
    if (typeof result.message === 'string' && result.message) {
      return new Error(result.message);
    }
  } catch {
    return new Error(`${fallback} (HTTP ${response.status}).`);
  }
  return new Error(`${fallback} (HTTP ${response.status}).`);
}

export function addPhoto(canvas: HTMLCanvasElement): Promise<void> {
  const upload = pendingUpload.then(async () => {
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!photo) {
      throw new Error('Could not encode the photo.');
    }

    const body = new FormData();
    body.append('photo', photo, 'photo.png');
    const response = await fetch(apiUrl('photos'), {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 201) {
      throw await photoRequestError(response, 'Could not upload the photo');
    }
  });

  pendingUpload = upload.catch(() => {}); // the photos page can open while a capture is stilll uploading.
  return upload;
}

export async function listPhotos(): Promise<Photo[]> {
  await pendingUpload;
  const response = await fetch(apiUrl('photos'), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error('Could not load the photos.');
  }

  const data: { photos: Photo[] } = await response.json();
  return data.photos;
}

export function photoImageUrl(id: number): string {
  return apiUrl(`photos/${id}/image`);
}

export async function getPhotoImage(id: number): Promise<Blob> {
  const response = await fetch(photoImageUrl(id), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw await photoRequestError(response, 'Could not download the photo');
  }

  return response.blob();
}

export async function deletePhoto(id: number): Promise<void> {
  const response = await fetch(apiUrl(`photos/${id}`), {
    method: 'DELETE',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 204 && response.status !== 404) {
    throw new Error('Could not delete the photo.');
  }
}
