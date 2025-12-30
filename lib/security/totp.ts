/**
 * TOTP (Time-based One-Time Password) Authentication
 * Implements RFC 6238 for two-factor authentication
 */

import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';

const ISSUER = 'Scroungers Multimedia';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30; // seconds

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  // Generate 20 bytes of random data for the secret
  const buffer = crypto.randomBytes(20);
  // Encode as base32 (OTPAuth library handles this internally)
  return buffer
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 32);
}

/**
 * Create a TOTP instance for a user
 */
function createTOTP(secret: string, username: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * Generate a TOTP token for the current time
 */
export function generateToken(secret: string, username: string): string {
  const totp = createTOTP(secret, username);
  return totp.generate();
}

/**
 * Verify a TOTP token
 * @param token - The 6-digit token to verify
 * @param secret - The user's TOTP secret
 * @param username - The username for the TOTP
 * @param window - Number of periods to check before/after (default 1)
 * @returns true if token is valid
 */
export function verifyToken(
  token: string,
  secret: string,
  username: string,
  window: number = 1
): boolean {
  const totp = createTOTP(secret, username);

  // validate returns null if invalid, or the time step difference if valid
  const delta = totp.validate({ token, window });
  return delta !== null;
}

/**
 * Generate the otpauth:// URI for the authenticator app
 */
export function generateOTPAuthURI(secret: string, username: string): string {
  const totp = createTOTP(secret, username);
  return totp.toString();
}

/**
 * Generate a QR code data URL for the authenticator app
 */
export async function generateQRCode(secret: string, username: string): Promise<string> {
  const uri = generateOTPAuthURI(secret, username);
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 256,
  });
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Hash backup codes for secure storage
 * @param codes - Array of plain backup codes
 * @returns Array of hashed backup codes
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) => {
    // Remove formatting for hashing
    const normalized = code.replace(/-/g, '').toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  });
}

/**
 * Verify a backup code against hashed codes
 * @param code - The backup code to verify
 * @param hashedCodes - Array of hashed backup codes
 * @returns Index of the matched code, or -1 if not found
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const hashed = crypto.createHash('sha256').update(normalized).digest('hex');

  return hashedCodes.findIndex((h) => h === hashed);
}

/**
 * Encrypt the TOTP secret for database storage
 */
export function encryptSecret(secret: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt the TOTP secret from database storage
 */
export function decryptSecret(encryptedData: string, encryptionKey: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * TOTP setup response type
 */
export interface TOTPSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  otpauthUri: string;
}

/**
 * Complete TOTP setup - generates everything needed for 2FA enrollment
 */
export async function setupTOTP(username: string): Promise<TOTPSetupResponse> {
  const secret = generateSecret();
  const qrCodeDataUrl = await generateQRCode(secret, username);
  const backupCodes = generateBackupCodes(10);
  const otpauthUri = generateOTPAuthURI(secret, username);

  return {
    secret,
    qrCodeDataUrl,
    backupCodes,
    otpauthUri,
  };
}

/**
 * Verify TOTP is correctly set up by requiring initial verification
 */
export function verifySetup(token: string, secret: string, username: string): boolean {
  return verifyToken(token, secret, username, 1);
}
