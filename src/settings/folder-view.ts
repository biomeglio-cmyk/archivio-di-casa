import Storage from 'expo-sqlite/kv-store';

// "Elenco" (the design list by month) or "Griglia" (tiles with covers, drag and drop) in the
// folders; the last choice is kept on the phone and used by every folder
export type FolderView = 'list' | 'grid';

const KEY = 'folder.view';

export function getFolderView(): FolderView {
  try {
    return Storage.getItemSync(KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export function saveFolderView(view: FolderView): void {
  try {
    Storage.setItemSync(KEY, view);
  } catch {
    // without storage the choice lasts until the folder is closed
  }
}
