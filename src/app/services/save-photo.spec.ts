import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { AndroidPhotoSaver } from './android-photo-saver';
import { savePhoto } from './save-photo';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
  registerPlugin: () => ({ save: vi.fn() }),
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: vi.fn() },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));

describe('savePhoto', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('writes Android photos through the native save picker without requiring a share target', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(AndroidPhotoSaver.save).mockResolvedValue({ saved: true });

    await savePhoto(new Blob(['image'], { type: 'image/png' }), 'photo-1.png');

    expect(AndroidPhotoSaver.save).toHaveBeenCalledWith({ name: 'photo-1.png', data: btoa('image') });
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('allows the Android save picker to be cancelled without reporting a download failure', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(AndroidPhotoSaver.save).mockResolvedValue({ saved: false });

    await expect(savePhoto(new Blob(['image']), 'photo-1.png')).resolves.toBeUndefined();
  });

  it('preserves the native write error so the photo page can explain the failure', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(AndroidPhotoSaver.save).mockRejectedValue(new Error('The selected folder could not be opened.'));

    await expect(savePhoto(new Blob(['image']), 'photo-1.png')).rejects.toThrow(
      'The selected folder could not be opened.',
    );
  });

  it('shares a cached PNG on iOS', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/photo-1.png' });
    vi.mocked(Share.share).mockResolvedValue({});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await savePhoto(new Blob(['image'], { type: 'image/png' }), 'photo-1.png');

    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: 'photo-1.png',
      data: btoa('image'),
      directory: Directory.Cache,
    });
    expect(Share.share).toHaveBeenCalledWith({ title: 'photo-1.png', files: ['file:///cache/photo-1.png'] });
    expect(click).not.toHaveBeenCalled();
  });

  it('keeps browser downloads and releases the temporary URL', async () => {
    vi.useFakeTimers();
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:photo');
        static override revokeObjectURL = revokeObjectURL;
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await savePhoto(new Blob(['image']), 'photo-1.png');

    const link = click.mock.instances[0] as HTMLAnchorElement;
    expect(link.download).toBe('photo-1.png');
    expect(link.href).toBe('blob:photo');
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
});
