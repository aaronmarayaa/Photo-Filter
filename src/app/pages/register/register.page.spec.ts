import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  let page: RegisterPage;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    page = TestBed.createComponent(RegisterPage).componentInstance;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ['1234567', /longer password/],
    ['é'.repeat(25), /shorter password/],
  ])('rejects passwords outside the PHP byte limit', async (password, warning) => {
    page.username = 'demouser';
    page.password = password;

    await page.submit();

    expect(page.warning()).toMatch(warning);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits once while a request is pending and clears the password on success', async () => {
    fetchMock.mockResolvedValue(Response.json({ user: { id: 1, username: 'demouser' } }, { status: 201 }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.username = ' demouser ';
    page.password = 'demo-password';

    await Promise.all([page.submit(), page.submit()]);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/photo-filter-backend/api/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'demouser', password: 'demo-password' }),
      }),
    );
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
      replaceUrl: true,
    });
    expect(page.password).toBe('');
  });
});
