import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync, getRandomBytes } from 'expo-crypto';
import type { FileHandle } from 'expo-file-system';

import { t } from '@/i18n';

// The .sottomano file: a header, then the zip archive encrypted in chunks.
//
//   offset  size  field
//   0       9     magic "SOTTOMANO"
//   9       1     format version (1)
//   10      1     key derivation: 1 = PBKDF2-HMAC-SHA256
//   11      4     PBKDF2 iterations (big endian)
//   15      16    salt (random)
//   31      7     nonce prefix (random)
//   38      4     chunk size in bytes (big endian)
//   42      …     chunks: AES-256-GCM ciphertext + 16-byte tag each
//
// Every chunk has its own nonce: prefix (7) + chunk number (4) + 1 if it is the last chunk (1),
// and the header is authenticated with every chunk (GCM "additional data"). So a wrong password,
// a changed header, chunks swapped, removed or cut off at the end: all fail the tag check.
//
// The key comes from the password with PBKDF2 (@noble/hashes, pure JS, audited). AES-GCM runs
// natively through expo-crypto (Apple CryptoKit): pure-JS AES on Hermes is ~1 MB/s, too slow
// for hundreds of MB of photos.

const MAGIC = new TextEncoder().encode('SOTTOMANO');
const FORMAT_VERSION = 1;
const KDF_PBKDF2_SHA256 = 1;
export const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 minimum for PBKDF2-HMAC-SHA256
const SALT_SIZE = 16;
const PREFIX_SIZE = 7;
export const CHUNK_SIZE = 1024 * 1024; // 1 MB of archive per chunk
const TAG_SIZE = 16;
export const HEADER_SIZE = MAGIC.length + 1 + 1 + 4 + SALT_SIZE + PREFIX_SIZE + 4; // 42

export type BackupHeader = {
  bytes: Uint8Array; // the raw header, authenticated with every chunk
  iterations: number;
  salt: Uint8Array;
  prefix: Uint8Array;
  chunkSize: number;
};

// Thrown when the file can't be opened. `kind` picks the message shown to the user.
export class BackupError extends Error {
  constructor(
    readonly kind: 'not-a-backup' | 'newer-version' | 'wrong-password' | 'damaged' | 'newer-app',
    message: string,
  ) {
    super(message);
  }
}

export function newHeader(): BackupHeader {
  const salt = getRandomBytes(SALT_SIZE);
  const prefix = getRandomBytes(PREFIX_SIZE);
  const bytes = new Uint8Array(HEADER_SIZE);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  bytes.set(MAGIC, offset);
  offset += MAGIC.length;
  bytes[offset++] = FORMAT_VERSION;
  bytes[offset++] = KDF_PBKDF2_SHA256;
  view.setUint32(offset, PBKDF2_ITERATIONS);
  offset += 4;
  bytes.set(salt, offset);
  offset += SALT_SIZE;
  bytes.set(prefix, offset);
  offset += PREFIX_SIZE;
  view.setUint32(offset, CHUNK_SIZE);
  return { bytes, iterations: PBKDF2_ITERATIONS, salt, prefix, chunkSize: CHUNK_SIZE };
}

export function parseHeader(bytes: Uint8Array): BackupHeader {
  const notABackup = new BackupError('not-a-backup', t('backupCrypto.notABackup'));
  if (bytes.length < HEADER_SIZE || MAGIC.some((byte, i) => bytes[i] !== byte)) throw notABackup;
  const view = new DataView(bytes.buffer, bytes.byteOffset, HEADER_SIZE);
  let offset = MAGIC.length;
  const version = bytes[offset++];
  const kdf = bytes[offset++];
  if (version !== FORMAT_VERSION || kdf !== KDF_PBKDF2_SHA256) {
    throw new BackupError('newer-version', t('backupCrypto.newerVersion'));
  }
  const iterations = view.getUint32(offset);
  offset += 4;
  const salt = bytes.slice(offset, offset + SALT_SIZE);
  offset += SALT_SIZE;
  const prefix = bytes.slice(offset, offset + PREFIX_SIZE);
  offset += PREFIX_SIZE;
  const chunkSize = view.getUint32(offset);
  // Sane limits, so a broken file can't ask for a huge key derivation or chunk
  if (iterations < 100_000 || iterations > 10_000_000 || chunkSize < 1024 || chunkSize > 64 * 1024 * 1024) throw notABackup;
  return { bytes: bytes.slice(0, HEADER_SIZE), iterations, salt, prefix, chunkSize };
}

// Lets React draw the "Protezione con la password in corso…" state before the long work starts:
// one frame, then one macrotask
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

// PBKDF2-HMAC-SHA256, 210,000 iterations (never lower). In pure JS on Hermes it takes many seconds
// (up to about a minute), so it runs in slices of KDF_SLICE_MS: after each slice noble yields
// to the event loop with setTimeout(0), and the screen keeps updating.
//
// TODO(dev build): at the first development build, compute PBKDF2 with react-native-quick-crypto
// (native, ~0.1 s). Same algorithm, iterations, salt and key length, so the .sottomano format and
// every existing backup stay exactly the same; only this function changes.
const KDF_SLICE_MS = 16; // about one frame of work between two yields

export async function deriveKey(password: string, header: BackupHeader): Promise<AESEncryptionKey> {
  await waitForPaint();
  const started = Date.now();
  const raw = await pbkdf2Async(sha256, password, header.salt, {
    c: header.iterations,
    dkLen: 32,
    asyncTick: KDF_SLICE_MS,
  });
  if (__DEV__) console.log(`[backup] PBKDF2-SHA256 ${header.iterations} iterations: ${Date.now() - started} ms`);
  const key = await AESEncryptionKey.import(raw);
  raw.fill(0);
  return key;
}

function nonceFor(header: BackupHeader, index: number, last: boolean): Uint8Array {
  const nonce = new Uint8Array(12);
  nonce.set(header.prefix, 0);
  new DataView(nonce.buffer).setUint32(PREFIX_SIZE, index);
  nonce[11] = last ? 1 : 0;
  return nonce;
}

// Collects the archive as it is produced and writes it encrypted, one full chunk at a time.
// The last chunk is only known at the end, so one chunk is always kept until finish().
export class EncryptingWriter {
  private pending: Uint8Array[] = [];
  private pendingSize = 0;
  private index = 0;

  constructor(
    private readonly handle: FileHandle,
    private readonly key: AESEncryptionKey,
    private readonly header: BackupHeader,
  ) {
    handle.writeBytesSync(header.bytes);
  }

  // Called synchronously by the zip writer
  push(data: Uint8Array): void {
    if (data.length === 0) return;
    this.pending.push(data);
    this.pendingSize += data.length;
  }

  // Encrypts every full chunk that is surely not the last one
  async flush(): Promise<void> {
    while (this.pendingSize > this.header.chunkSize) {
      await this.writeChunk(this.take(this.header.chunkSize), false);
    }
  }

  async finish(): Promise<void> {
    await this.flush();
    await this.writeChunk(this.take(this.pendingSize), true);
  }

  private take(size: number): Uint8Array {
    const out = new Uint8Array(size);
    let filled = 0;
    while (filled < size) {
      const first = this.pending[0];
      const needed = size - filled;
      if (first.length <= needed) {
        out.set(first, filled);
        filled += first.length;
        this.pending.shift();
      } else {
        out.set(first.subarray(0, needed), filled);
        this.pending[0] = first.subarray(needed);
        filled = size;
      }
    }
    this.pendingSize -= size;
    return out;
  }

  private async writeChunk(plain: Uint8Array, last: boolean): Promise<void> {
    const sealed = await aesEncryptAsync(plain, this.key, {
      nonce: { bytes: nonceFor(this.header, this.index, last) },
      additionalData: this.header.bytes,
      tagLength: TAG_SIZE,
    });
    await this.handle.writeBytes(await sealed.ciphertext({ includeTag: true }));
    this.index++;
  }
}

// Decrypts the whole file (after the header) into `output`. The first chunk tells whether the
// password is right; any later failure means the file was changed or cut.
export async function decryptChunks(
  input: FileHandle,
  output: FileHandle,
  key: AESEncryptionKey,
  header: BackupHeader,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const total = input.size ?? 0;
  input.offset = HEADER_SIZE;
  let position = HEADER_SIZE;
  let index = 0;
  if (total <= HEADER_SIZE) throw new BackupError('damaged', t('backupCrypto.empty'));

  while (position < total) {
    const size = Math.min(header.chunkSize + TAG_SIZE, total - position);
    const last = position + size >= total;
    const sealedBytes = await input.readBytes(size);
    if (sealedBytes.length !== size || size <= TAG_SIZE) {
      throw new BackupError('damaged', t('backupCrypto.incomplete'));
    }
    let plain: Uint8Array;
    try {
      const sealed = AESSealedData.fromParts(nonceFor(header, index, last), sealedBytes, TAG_SIZE);
      plain = await aesDecryptAsync(sealed, key, { additionalData: header.bytes });
    } catch {
      throw index === 0
        ? new BackupError('wrong-password', t('backupCrypto.wrongPassword'))
        : new BackupError('damaged', t('backupCrypto.damaged'));
    }
    await output.writeBytes(plain);
    position += size;
    index++;
    onProgress(position, total);
  }
}
