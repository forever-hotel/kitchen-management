import { cookies } from 'next/headers';

import { KMS_SESSION_COOKIE_NAME } from './kms-cookie-policy';

import {
  clearKmsSessionCookie,
  getKmsSessionToken,
  setKmsSessionCookie,
} from './kms-session-store';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const TOKEN = 'test-gateway-access-token';

const cookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const mockedCookies = jest.mocked(cookies);

describe('KMS server-side session cookie store', () => {
  const originalKey = process.env.KMS_SESSION_ENCRYPTION_KEY;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.KMS_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

    mockedCookies.mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.KMS_SESSION_ENCRYPTION_KEY;
    } else {
      process.env.KMS_SESSION_ENCRYPTION_KEY = originalKey;
    }
  });

  it('stores an encrypted token with secure cookie options', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    await setKmsSessionCookie(TOKEN, expiresAt);

    expect(cookieStore.set).toHaveBeenCalledWith(
      KMS_SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: expect.any(Number),
      }),
    );

    const encryptedValue = cookieStore.set.mock.calls[0][1] as string;

    expect(encryptedValue).not.toContain(TOKEN);
  });

  it('reads and decrypts a stored session', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    await setKmsSessionCookie(TOKEN, expiresAt);

    const encryptedValue = cookieStore.set.mock.calls[0][1] as string;

    cookieStore.get.mockReturnValue({
      name: KMS_SESSION_COOKIE_NAME,
      value: encryptedValue,
    });

    await expect(getKmsSessionToken()).resolves.toEqual({
      accessToken: TOKEN,
      expiresAt,
    });
  });

  it('returns null when the cookie is missing', async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(getKmsSessionToken()).resolves.toBeNull();
  });

  it('rejects an invalid encrypted cookie', async () => {
    cookieStore.get.mockReturnValue({
      name: KMS_SESSION_COOKIE_NAME,
      value: 'invalid-session-value',
    });

    await expect(getKmsSessionToken()).resolves.toBeNull();
  });

  it('deletes the browser session cookie', async () => {
    await clearKmsSessionCookie();

    expect(cookieStore.delete).toHaveBeenCalledWith(KMS_SESSION_COOKIE_NAME);
  });
});
