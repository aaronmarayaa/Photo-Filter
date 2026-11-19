import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { PhotosPage } from './photos.page';

describe('PhotosPage', () => {
  let component: PhotosPage;
  let fixture: ComponentFixture<PhotosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the download failure and enables the action again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Log in first.' }), { status: 401 })),
    );

    await component.savePhoto({ id: 1, createdAt: '2026-11-19T00:00:00Z' });

    expect(component.actionError()).toBe('Log in first.');
    expect(component.working()).toBe(false);
  });
});
