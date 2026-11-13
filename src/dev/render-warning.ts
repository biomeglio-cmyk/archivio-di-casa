import { useEffect, useRef } from 'react';

// Development only: warns when a component renders more than 50 times in one second, the sign of a
// render loop (a state set during render, an effect with changing deps, two measurements that
// ping-pong). The warning names the component and, when given, what it shows. No cost in release
// builds (__DEV__ is false there: the hook only keeps an empty ref).
const LIMIT = 50;
const WINDOW_MS = 1000;
const QUIET_MS = 5000; // one warning per component every 5 seconds at most

export function useRenderWarning(name: string, detail?: string | null): void {
  const stamps = useRef<number[]>([]);
  const warnedAt = useRef(0);
  // After every render (no deps): count the renders of the last second
  useEffect(() => {
    if (!__DEV__) return;
    const now = Date.now();
    const recent = stamps.current.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    stamps.current = recent;
    if (recent.length > LIMIT && now - warnedAt.current > QUIET_MS) {
      warnedAt.current = now;
      console.warn(`[render loop] ${name}${detail ? ` "${detail.slice(0, 40)}"` : ''} rendered ${recent.length} times in 1 s`);
    }
  });
}

// For the root Profiler: commits of the whole app per second (a loop that touches many components)
const commits: number[] = [];
let appWarnedAt = 0;

export function onAppCommit(id: string): void {
  if (!__DEV__) return;
  const now = Date.now();
  while (commits.length > 0 && now - commits[0] >= WINDOW_MS) commits.shift();
  commits.push(now);
  if (commits.length > LIMIT && now - appWarnedAt > QUIET_MS) {
    appWarnedAt = now;
    console.warn(`[render loop] ${id}: ${commits.length} commits in 1 s`);
  }
}
