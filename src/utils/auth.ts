function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function enableBiometricLock(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    alert('Biometrics are not supported on this device/browser.');
    return false;
  }
  
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: {
          name: "Money Tracker",
        },
        user: {
          id: userId,
          name: "user",
          displayName: "User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (credential && 'rawId' in credential) {
      const credentialIdStr = bufferToBase64(credential.rawId as ArrayBuffer);
      localStorage.setItem('biometric_credential_id', credentialIdStr);
      localStorage.setItem('appLockEnabled', 'true');
      return true;
    }
  } catch (error) {
    console.error('Error enabling biometric lock:', error);
    alert('Failed to setup biometric lock. ' + (error as Error).message);
  }
  return false;
}

export function disableBiometricLock() {
  localStorage.removeItem('biometric_credential_id');
  localStorage.setItem('appLockEnabled', 'false');
}

export function isBiometricLockEnabled(): boolean {
  return localStorage.getItem('appLockEnabled') === 'true';
}

export async function unlockWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  
  const savedId = localStorage.getItem('biometric_credential_id');
  if (!savedId) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credentialId = base64ToBuffer(savedId);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      }
    });

    if (assertion) {
      return true;
    }
  } catch (error) {
    console.error('Error unlocking with biometrics:', error);
  }
  
  return false;
}
