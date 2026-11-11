import type { FileHandle } from 'expo-file-system';

// Minimal reader for the zip archives WE write (fflate, every entry "stored", no compression):
// it reads the central directory at the end, then copies each entry straight from the file,
// a slice at a time, without loading the archive in memory. The data was already authenticated
// by AES-GCM while decrypting, so the zip CRCs need no second check.

export type ZipEntry = { name: string; offset: number; size: number };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const STORED = 0;

function read(handle: FileHandle, offset: number, length: number): Uint8Array {
  handle.offset = offset;
  return handle.readBytesSync(length);
}

export function listEntries(handle: FileHandle): ZipEntry[] {
  const size = handle.size ?? 0;
  // End of central directory: 22 bytes at the end (plus a comment of up to 64 KB, not ours)
  const tailSize = Math.min(size, 22 + 0xffff);
  const tail = read(handle, size - tailSize, tailSize);
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Archivio non valido');

  const count = tailView.getUint16(eocd + 10, true);
  const directorySize = tailView.getUint32(eocd + 12, true);
  const directoryOffset = tailView.getUint32(eocd + 16, true);
  const directory = read(handle, directoryOffset, directorySize);
  const view = new DataView(directory.buffer, directory.byteOffset, directory.byteLength);
  const decoder = new TextDecoder();

  const entries: ZipEntry[] = [];
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== CENTRAL_SIGNATURE) throw new Error('Archivio non valido');
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(directory.subarray(p + 46, p + 46 + nameLength));
    if (method !== STORED) throw new Error('Archivio non valido');

    // The data starts after the local header, whose name/extra lengths can differ
    const local = read(handle, localOffset, 30);
    const localView = new DataView(local.buffer, local.byteOffset, local.byteLength);
    if (localView.getUint32(0, true) !== LOCAL_SIGNATURE) throw new Error('Archivio non valido');
    const dataOffset = localOffset + 30 + localView.getUint16(26, true) + localView.getUint16(28, true);

    if (!name.endsWith('/')) entries.push({ name, offset: dataOffset, size: compressedSize });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// Copies one entry into `output`, 1 MB at a time
export async function extractEntry(
  input: FileHandle,
  entry: ZipEntry,
  output: FileHandle,
  onBytes: (count: number) => void,
): Promise<void> {
  const slice = 1024 * 1024;
  input.offset = entry.offset;
  let left = entry.size;
  while (left > 0) {
    const bytes = await input.readBytes(Math.min(slice, left));
    if (bytes.length === 0) throw new Error('Archivio incompleto');
    await output.writeBytes(bytes);
    left -= bytes.length;
    onBytes(bytes.length);
  }
}
