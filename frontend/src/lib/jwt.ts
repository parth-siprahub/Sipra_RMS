/**
 * Read access-token expiry from a JWT payload (no signature verification).
 * Used only to align client-side session timing with Supabase-issued exp.
 */
export function getAccessTokenExpiryMs(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded)) as { exp?: number };
        if (typeof payload.exp !== 'number') return null;
        return payload.exp * 1000;
    } catch {
        return null;
    }
}
