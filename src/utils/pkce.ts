/**
 * PKCE (Proof Key for Code Exchange) Utility
 * Used for secure OAuth2 Authorization Code flow in public clients (Frontend)
 */

/**
 * Generates a random string of a specified length
 */
const generateRandomString = (length: number): string => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/**
 * Hashes a string using SHA-256 and returns a Base64URL encoded string
 */
export const sha256 = async (plain: string): Promise<ArrayBuffer> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

export const base64urlencode = (a: ArrayBuffer): string => {
    let str = '';
    const bytes = new Uint8Array(a);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

/**
 * Generates a code_verifier and code_challenge pair for PKCE
 */
export const generatePKCE = async () => {
    const code_verifier = generateRandomString(128);
    const challenge_buffer = await sha256(code_verifier);
    const code_challenge = base64urlencode(challenge_buffer);

    return {
        code_verifier,
        code_challenge,
    };
};

/**
 * Stores the PKCE verifier and state in SessionStorage for use after redirect
 */
export const storePKCEState = (verifier: string, state: string) => {
    sessionStorage.setItem('pkce_code_verifier', verifier);
    sessionStorage.setItem('pkce_state', state);
};

/**
 * Retrieves and clears the PKCE verifier from SessionStorage
 */
export const popPKCEVerifier = () => {
    const verifier = sessionStorage.getItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_code_verifier');
    return verifier;
};

/**
 * Validates the state parameter to prevent CSRF
 */
export const validatePKCEState = (incomingState: string) => {
    const savedState = sessionStorage.getItem('pkce_state');
    // Note: We don't remove it here to allow for React 18 double-render resiliency
    return incomingState === savedState;
};

export const generateState = () => generateRandomString(32);

export const getStoredPKCE = () => {
    const verifier = sessionStorage.getItem('pkce_code_verifier');
    return verifier ? { code_verifier: verifier } : null;
};

export const getStoredState = () => {
    return sessionStorage.getItem('pkce_state');
};
