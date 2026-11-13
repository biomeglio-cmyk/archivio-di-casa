import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ColorWheel } from '@/components/color-wheel';
import { Text, TextInput } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { hexToWheel } from '@/utils/colors';
import { wheelHex } from '@/utils/password-tools';

export type ColorPreset = {
  key: string; // what onChange gives back for this swatch
  name: string; // VoiceOver
  colors: readonly [string, string]; // its gradient (the same color twice for a solid one)
  symbol?: SFSymbol; // e.g. the palette icon on "Colore di Aspetto"
  symbolColor?: string;
};

type Props = {
  presets: ColorPreset[];
  value: string | null; // a preset key, or '#RRGGBB' for "Il tuo colore"
  onChange: (value: string) => void;
  size?: number; // swatch diameter: 32 (default) or 38
  columns?: number; // swatches per row (the custom one included)
  label?: string; // VoiceOver name of the group
  onDraggingChange?: (dragging: boolean) => void; // a finger on the wheel: the page must not scroll
};

const isHex = (value: string | null): value is string => value !== null && /^#[0-9A-F]{6}$/i.test(value);
const RAINBOW = ['#FF5A5A', '#FFC24A', '#5CD68A', '#4AB8FF', '#7A5CFF', '#FF5AC8'] as const;

// THE color choice of the app (category, cover "Colore" of documents and cards, Password preview):
// the preset swatches, then "Il tuo colore" (docs/design/NuovaPassword.dc.html). Tapping it opens
// the panel below: the color wheel (touch or drag) and the hex code, which can also be typed.
// The chosen swatch has a white ring and an outer ring in its color.
export function ColorPicker({ presets, value, onChange, size = 32, columns, label = 'Colore', onDraggingChange }: Props) {
  const presetChosen = presets.some((p) => p.key === value);
  const custom = !presetChosen && isHex(value) ? value.toUpperCase() : null;
  const [open, setOpen] = useState(custom !== null);
  const [wheel, setWheel] = useState(() => hexToWheel(custom ?? '#3B5BFF'));
  const [typed, setTyped] = useState(custom ?? wheelHex(wheel.hue, wheel.radius));
  const customOn = custom !== null && open;
  const shown = custom ?? wheelHex(wheel.hue, wheel.radius);
  const cell = columns ? { width: `${100 / columns}%` as const } : styles.cellAuto;

  function pickWheel(hue: number, radius: number) {
    const hex = wheelHex(hue, radius);
    setWheel({ hue, radius });
    setTyped(hex);
    onChange(hex);
  }

  function type(text: string) {
    const hex = (text.startsWith('#') ? text : `#${text}`).toUpperCase();
    setTyped(hex);
    if (isHex(hex)) {
      setWheel(hexToWheel(hex));
      onChange(hex);
    }
  }

  function openCustom() {
    setOpen(true);
    onChange(custom ?? shown);
  }

  const ring = (color: string) => ({ boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${color}` });
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {presets.map((preset) => {
          const on = preset.key === value;
          return (
            <View key={preset.key} style={[styles.cell, cell]}>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  onChange(preset.key);
                }}
                accessibilityRole="radio"
                accessibilityLabel={preset.name}
                accessibilityState={{ checked: on }}
                hitSlop={4}
                style={[round, on && ring(preset.colors[1])]}>
                <LinearGradient colors={preset.colors} start={GRADIENT_START} end={GRADIENT_END} style={[styles.fill, round]}>
                  {preset.symbol && <SymbolView name={preset.symbol} tintColor={preset.symbolColor ?? '#FFFFFF'} size={Math.round(size * 0.42)} />}
                </LinearGradient>
              </Pressable>
            </View>
          );
        })}
        <View style={[styles.cell, cell]}>
          <Pressable
            onPress={openCustom}
            accessibilityRole="radio"
            accessibilityLabel="Il tuo colore"
            accessibilityState={{ checked: customOn || custom !== null }}
            hitSlop={4}
            style={[round, custom !== null && ring(custom)]}>
            <LinearGradient colors={RAINBOW} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, round]}>
              <View style={[styles.dot, { backgroundColor: custom ?? '#FFFFFF' }]}>
                <SymbolView name="plus" tintColor={custom ? '#FFFFFF' : '#4B5068'} size={Math.round(size * 0.3)} weight="bold" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {open && (
        <View style={styles.panel}>
          <View style={styles.center}>
            <ColorWheel hue={wheel.hue} radius={wheel.radius} onChange={pickWheel} onDraggingChange={onDraggingChange} />
          </View>
          <View style={styles.hexRow}>
            <View style={[styles.hexSwatch, { backgroundColor: shown }]} />
            <View style={styles.hexField}>
              <Text style={styles.hexLabel}>Codice</Text>
              <TextInput
                value={typed}
                onChangeText={type}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                accessibilityLabel="Codice colore"
                style={styles.hexInput}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellAuto: {
    marginRight: 12,
  },
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: '50%',
    height: '50%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.paleLilac,
  },
  center: {
    alignItems: 'center',
  },
  hexRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hexSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  hexField: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hexLabel: {
    marginRight: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  hexInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
});
