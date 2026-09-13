const KEY = 'saldo-cero-biometric';

interface Enrollment {
  userId: string;
  credentialId: string;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function read(): Enrollment | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Enrollment) : null;
  } catch {
    return null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(userId: string): boolean {
  const e = read();
  return !!e && e.userId === userId;
}

export function disableBiometric(): void {
  localStorage.removeItem(KEY);
}

export async function enrollBiometric(userId: string, email: string): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Saldo Cero', id: location.hostname },
      user: { id: new TextEncoder().encode(userId), name: email, displayName: email },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error('registro cancelado');
  localStorage.setItem(KEY, JSON.stringify({ userId, credentialId: toBase64(cred.rawId) }));
}

export async function verifyBiometric(): Promise<boolean> {
  const e = read();
  if (!e) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64(e.credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
