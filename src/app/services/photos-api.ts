import { apiUrl } from './api-url';

const photosUrl = apiUrl('photos');

export interface Photo {
  id: number;
  createdAt: string;
}

let pendingUpload = Promise.resolve();

export function addPhoto(canvas: HTMLCanvasElement): Promise<void> {
  const upload = pendingUpload.then(async () => {
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!photo) {
      throw new Error('Could not encode the photo.');
    }

    const response = await fetch(photosUrl, {
      method: 'POST',
      body: photo,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 201) {
      throw new Error('Could not add the photo to the list.');
    }
  });

  // The Photos page can open while a capture is still uploading.
  pendingUpload = upload.catch(() => {});
  return upload;
}

export async function listPhotos(): Promise<Photo[]> {
  await pendingUpload;
  const response = await fetch(photosUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error('Could not load the photos.');
  }

  const data: { photos: Photo[] } = await response.json();
  return data.photos;
}

export function photoImageUrl(id: number): string {
  return `${photosUrl}/${id}/image`;
}

export async function getPhotoImage(id: number): Promise<Blob> {
  const response = await fetch(photoImageUrl(id), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error('Could not download the photo.');
  }

  return response.blob();
}

export async function deletePhoto(id: number): Promise<void> {
  const response = await fetch(`${photosUrl}/${id}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 204 && response.status !== 404) {
    throw new Error('Could not delete the photo.');
  }
}
