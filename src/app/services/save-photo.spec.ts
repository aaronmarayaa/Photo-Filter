import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { savePhoto } from './save-photo';

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

  it('shares a cached PNG on Android instead of clicking a browser download', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
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
