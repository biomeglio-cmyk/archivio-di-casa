import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState, type DependencyList } from 'react';

import { useI18n } from '@/i18n';
import { usePaletteId } from '@/settings/palette';
import { useTheme } from '@/hooks/use-theme';

type QueryState<T> = { data: T | undefined; error: Error | undefined };

/**
 * Runs a database query when the screen appears and re-runs it whenever the database changes.
 *
 *   const { data: people } = useDbQuery((db) => listPeople(db), []);
 *
 * `deps` works like the dependency array of useEffect: pass the values the query uses
 * (e.g. the id from the route), so the query re-runs when they change.
 */
const COALESCE_MS = 40;

export function useDbQuery<T>(query: (db: SQLiteDatabase) => Promise<T>, deps: DependencyList): QueryState<T> {
  const db = useSQLiteContext();
  // A new palette in "Aspetto" changes the colors of the categories: reload like after a change
  const palette = usePaletteId();
  // A new language changes the names of the built-in categories (and dates in the results)
  const { language } = useI18n();
  // Tema notte changes the tiles of "Pastello" (night variant): reload like after a change
  const { isDark } = useTheme();
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: undefined });

  // Like Angular's ngOnInit + ngOnDestroy in one place:
  // the body runs after the first render (and again when deps change),
  // the returned function runs when the screen goes away (or before re-running).
  useEffect(() => {
    let active = true; // ignores results that arrive after the screen went away
    let running = false; // a load in flight
    let again = false; // a change arrived meanwhile: one more load when it ends
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      running = true;
      query(db)
        .then(
          (data) => active && setState({ data, error: undefined }),
          (error: Error) => active && setState((prev) => ({ data: prev.data, error })),
        )
        .finally(() => {
          running = false;
          if (again && active) {
            again = false;
            load();
          }
        });
    };

    // A transaction that writes 100 rows sends 100 change events: they become ONE reload (after a
    // short pause), and never two loads at once — otherwise every screen re-queried 100 times and
    // the JS thread froze the interface
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (running) again = true;
        else load();
      }, COALESCE_MS);
    };

    load();
    // Any INSERT/UPDATE/DELETE anywhere in the app → reload, so lists stay up to date
    const subscription = addDatabaseChangeListener(schedule);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
    // `query` is a new function on every render: the caller's `deps` decide when to re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, palette, language, isDark, ...deps]);

  return state;
}
