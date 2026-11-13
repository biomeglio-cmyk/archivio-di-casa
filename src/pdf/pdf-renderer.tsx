import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView as NativeWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { PDFJS_FONTS, PDFJS_LIBRARY, PDFJS_WASM, PDFJS_WORKER } from '@/pdf/pdfjs-assets';
import { RENDERER_HTML } from '@/pdf/renderer-page';

// Draws pages of PDFs as JPEG images with pdf.js, in a hidden WebView mounted once at the root
// (<PdfRendererHost />). Fully offline: pdf.js, its worker and its fonts are assets of the app.
// One step at a time (open, draw a page), each with a time limit, so a heavy or damaged PDF can
// never hang the app: the caller gets a PdfError and shows the generic PDF icon instead.
//
//   const pdf = await openPdf(uri)          // { pages, render(page, width, quality), close() }
//   const image = await pdf.render(1, 1000) // { base64, width, height }
//   pdf.close()

export type PdfFailure = 'password' | 'invalid' | 'timeout' | 'unavailable';

export class PdfError extends Error {
  constructor(readonly reason: PdfFailure) {
    super(`PDF ${reason}`);
  }
}

export type RenderedPage = { base64: string; width: number; height: number };

export type OpenPdf = {
  pages: number;
  render: (page: number, width: number, quality?: number) => Promise<RenderedPage>;
  close: () => void;
};

// The package's class type (generic, defaulting to never-props) doesn't fit JSX with a ref: the
// same component, typed with the one method used here
type WebViewHandle = { injectJavaScript: (code: string) => void };
const WebView = NativeWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

const BOOT_MS = 30_000;
const OPEN_MS = 25_000;
const RENDER_MS = 25_000;
const CHUNK = 512 * 1024; // the PDF reaches the WebView in parts of 512 KB (as base64)

type Message =
  | { type: 'ready' }
  | { type: 'bootError'; message: string }
  | { type: 'opened'; id: string; pages: number }
  | { type: 'openError'; id: string; reason: 'password' | 'invalid' }
  | { type: 'page'; id: string; job: number; data: string; width: number; height: number }
  | { type: 'renderError'; id: string; job: number };

type Waiter = {
  resolve: (message: Message) => void;
  reject: (error: PdfError) => void;
  timer: ReturnType<typeof setTimeout>;
};

// ---- The link with the mounted WebView ----

let inject: ((code: string) => void) | null = null;
let booted: Promise<void> | null = null;
let onHostReady: (() => void) | null = null;
const waiters = new Map<string, Waiter>();
let lane: Promise<unknown> = Promise.resolve(); // one step at a time in the WebView
let nextId = 0;
let nextJob = 0;

function call(name: string, ...args: (string | number)[]): void {
  inject?.(`window.${name}(${args.map((a) => JSON.stringify(a)).join(',')}); true;`);
}

function waitFor(key: string, ms: number): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(key);
      reject(new PdfError('timeout'));
    }, ms);
    waiters.set(key, { resolve, reject, timer });
  });
}

function settle(key: string, message: Message): void {
  const waiter = waiters.get(key);
  if (!waiter) return; // too late: the caller already gave up
  waiters.delete(key);
  clearTimeout(waiter.timer);
  waiter.resolve(message);
}

// The WebView went away (its process was ended by iOS, or the host unmounted): every pending
// step fails and the next request starts pdf.js again
function reset(): void {
  booted = null;
  for (const [key, waiter] of waiters) {
    clearTimeout(waiter.timer);
    waiter.reject(new PdfError('unavailable'));
    waiters.delete(key);
  }
}

function onMessage(event: WebViewMessageEvent): void {
  let message: Message;
  try {
    message = JSON.parse(event.nativeEvent.data) as Message;
  } catch {
    return;
  }
  switch (message.type) {
    case 'ready':
    case 'bootError':
      return settle('boot', message);
    case 'opened':
    case 'openError':
      return settle(`open:${message.id}`, message);
    case 'page':
    case 'renderError':
      return settle(`render:${message.id}:${message.job}`, message);
  }
}

async function assetText(module: number): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

async function assetBase64(module: number): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  return new File(asset.localUri ?? asset.uri).base64();
}

// Starts pdf.js the first time it is needed (fonts and decoders first, then the library)
function boot(): Promise<void> {
  if (booted) return booted;
  booted = (async () => {
    if (!inject) {
      // The host mounts with the app: wait for it a moment
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new PdfError('unavailable')), BOOT_MS);
        onHostReady = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
    for (const [name, module] of [...Object.entries(PDFJS_FONTS), ...Object.entries(PDFJS_WASM)]) {
      call('__file', name, await assetBase64(module));
    }
    const [library, worker] = await Promise.all([assetText(PDFJS_LIBRARY), assetText(PDFJS_WORKER)]);
    const answer = waitFor('boot', BOOT_MS);
    call('__boot', library, worker);
    const message = await answer;
    if (message.type !== 'ready') throw new PdfError('unavailable');
  })();
  booted.catch(() => {
    booted = null; // tries again on the next request
  });
  return booted;
}

// Runs `step` after the previous one finished (whatever its outcome)
function inLane<T>(step: () => Promise<T>): Promise<T> {
  const run = lane.then(step, step);
  lane = run.catch(() => undefined);
  return run;
}

// Opens a PDF file (file:// URI). Rejects with PdfError: 'password', 'invalid', 'timeout', 'unavailable'.
export async function openPdf(uri: string): Promise<OpenPdf> {
  await boot();
  const id = `p${++nextId}`;
  const base64 = await new File(uri).base64();
  const message = await inLane(async () => {
    for (let start = 0; start < base64.length; start += CHUNK) {
      call('__chunk', id, base64.slice(start, start + CHUNK));
    }
    const answer = waitFor(`open:${id}`, OPEN_MS);
    call('__open', id);
    return answer;
  });
  if (message.type === 'openError') throw new PdfError(message.reason);
  if (message.type !== 'opened') throw new PdfError('invalid');

  let closed = false;
  return {
    pages: message.pages,
    render: (page, width, quality = 0.85) =>
      inLane(async () => {
        if (closed) throw new PdfError('unavailable');
        const job = ++nextJob;
        const answer = waitFor(`render:${id}:${job}`, RENDER_MS);
        call('__render', id, job, page, Math.round(width), quality);
        const result = await answer;
        if (result.type !== 'page') throw new PdfError('invalid');
        return { base64: result.data, width: result.width, height: result.height };
      }),
    close: () => {
      if (closed) return;
      closed = true;
      call('__close', id);
    },
  };
}

// The hidden WebView, mounted once at the root of the app. Never visible, never touchable,
// hidden from VoiceOver.
export function PdfRendererHost() {
  const ref = useRef<WebViewHandle>(null);
  const [generation, setGeneration] = useState(0);

  // The page is loaded only after onLoadEnd: calls before that would be lost
  useEffect(() => {
    return () => {
      inject = null;
      reset();
    };
  }, [generation]);

  return (
    <View
      style={styles.hidden}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <WebView
        key={generation}
        ref={ref}
        source={{ html: RENDERER_HTML }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onLoadEnd={() => {
          inject = (code) => ref.current?.injectJavaScript(code);
          const ready = onHostReady;
          onHostReady = null;
          ready?.();
        }}
        // iOS ended the WebView (memory): start again with a new one
        onContentProcessDidTerminate={() => {
          reset();
          setGeneration((g) => g + 1);
        }}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: -10,
    top: -10,
    opacity: 0,
    overflow: 'hidden',
  },
  web: {
    width: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
});
