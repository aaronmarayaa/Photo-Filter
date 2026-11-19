import { registerPlugin } from '@capacitor/core';

interface PhotoSaverPlugin {
  save(options: { name: string; data: string }): Promise<{ saved: boolean }>;
}

export const AndroidPhotoSaver = registerPlugin<PhotoSaverPlugin>('PhotoSaver');
