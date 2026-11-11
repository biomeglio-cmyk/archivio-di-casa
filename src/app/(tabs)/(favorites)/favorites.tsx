import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FavoritesSection } from '@/components/favorites-section';
import { TileScrollView } from '@/components/tile-grid';

// Tab "Preferiti" (first version: the same section shown in Home)
export default function FavoritesScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TileScrollView>
        <FavoritesSection />
      </TileScrollView>
    </GestureHandlerRootView>
  );
}
