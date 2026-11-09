import { Directory, File, Paths } from 'expo-file-system';

// Shared and previewed files get a readable name ("Carta d'identità - Fronte.jpg") instead of
// the internal one ("1731…-front.jpg"). The copies live in the cache: iOS may clear them, and
// that's fine because they are recreated every time.
const FOLDER = 'condivisi';

// Characters iOS or the receiving apps don't accept in file names
function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '-').trim() || 'Documento';
}

export async function namedCopy(source: File, baseName: string): Promise<File> {
  if (!source.exists) {
    throw new Error('File non trovato sul telefono.');
  }
  const directory = new Directory(Paths.cache, FOLDER);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const target = new File(directory, `${safeFileName(baseName)}${source.extension.toLowerCase()}`);
  if (target.exists) target.delete(); // a previous copy with the same name
  await source.copy(target);
  return target;
}
