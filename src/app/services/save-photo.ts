import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { AndroidPhotoSaver } from './android-photo-saver';

export async function savePhoto(image: Blob, name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(image);
    });
    if (Capacitor.getPlatform() === 'android') {
      await AndroidPhotoSaver.save({ name, data });
      return;
    }
    const file = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    await Share.share({ title: name, files: [file.uri] });
    return;
  }

  const url = URL.createObjectURL(image);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
