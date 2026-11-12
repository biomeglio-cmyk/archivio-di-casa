import Storage from 'expo-sqlite/kv-store';

// "Elenco" (the design list) or "Griglia" (tiles with covers, drag and drop). The last choice is
// kept on the phone: one for every folder, one for Preferiti.
export type FolderView = 'list' | 'grid';

const FOLDER_KEY = 'folder.view';
const FAVORITES_KEY = 'favorites.view';

function read(key: string): FolderView {
  try {
    return Storage.getItemSync(key) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

function write(key: string, view: FolderView): void {
  try {
    Storage.setItemSync(key, view);
  } catch {
    // without storage the choice lasts until the screen is closed
  }
}

export const getFolderView = () => read(FOLDER_KEY);
export const saveFolderView = (view: FolderView) => write(FOLDER_KEY, view);
export const getFavoritesView = () => read(FAVORITES_KEY);
export const saveFavoritesView = (view: FolderView) => write(FAVORITES_KEY, view);
