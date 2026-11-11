import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

// Passwords of the "Password" documents: ONLY in the iOS Keychain (expo-secure-store), one item
// per document id. Never in SQLite, never logged. "This device only": the encrypted .sottomano
// backup is the way to move them to another iPhone.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const keyFor = (documentId: number) => `document-password-${documentId}`;

export async function savePassword(documentId: number, password: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(documentId), password, OPTIONS);
}

export async function readPassword(documentId: number): Promise<string | null> {
  return SecureStore.getItemAsync(keyFor(documentId), OPTIONS);
}

// Also called for documents that never had a password: then it does nothing
export async function deletePassword(documentId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(documentId), OPTIONS);
  } catch {
    // nothing to delete
  }
}

// Every "Password" document of the database, for the backup
export async function passwordDocumentIds(db: SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ id: number }>(
    "SELECT d.id FROM documents d JOIN categories c ON c.id = d.category_id WHERE c.kind = 'password'",
  );
  return rows.map((row) => row.id);
}
