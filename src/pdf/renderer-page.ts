// The page that runs pdf.js inside a hidden WebView, fully offline: pdf.js, its worker, the
// standard fonts and the image decoders arrive from the app (local assets, never a CDN) and are
// started from blob: URLs. The app calls the functions below with injected JavaScript; the page
// answers with postMessage (JSON):
//   __file(name, base64)                      a font or decoder pdf.js may ask for
//   __boot(librarySource, workerSource)       → { type: 'ready' } | { type: 'bootError', message }
//   __chunk(id, base64Part)                   the PDF arrives in parts (big files)
//   __open(id)                                → { type: 'opened', id, pages } | { type: 'openError', id, reason }
//   __render(id, job, page, width, quality)   → { type: 'page', id, job, data, width, height } | { type: 'renderError', id, job }
//   __close(id)
// reason: 'password' (protected) or 'invalid' (damaged, not a PDF). Nothing is ever shown on
// screen and nothing leaves the phone.

// Small stand-ins for what older iOS versions lack (pdf.js 6 needs them; iOS 17.4+ has them).
// In a string: the worker gets them too.
const POLYFILLS = `
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    var resolve, reject;
    var promise = new Promise(function (a, b) { resolve = a; reject = b; });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}
if (!ArrayBuffer.prototype.transferToFixedLength) {
  ArrayBuffer.prototype.transferToFixedLength = ArrayBuffer.prototype.transfer = function (length) {
    length = length === undefined ? this.byteLength : length;
    var copy = new ArrayBuffer(length);
    new Uint8Array(copy).set(new Uint8Array(this, 0, Math.min(length, this.byteLength)));
    return copy;
  };
}
`;

export const RENDERER_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body>
<script>
${POLYFILLS}
// A hidden WebView may never get animation frames: pdf.js continues its drawing with timers instead
window.requestAnimationFrame = function (callback) { return setTimeout(function () { callback(Date.now()); }, 0); };
window.cancelAnimationFrame = function (id) { clearTimeout(id); };
(function () {
  var WORKER_PRELUDE = ${JSON.stringify(POLYFILLS)};
  var lib = null;
  var files = {};
  var parts = {};
  var docs = {};
  function send(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function blobUrl(source) {
    return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  }
  function bytes(base64) {
    var binary = atob(base64);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  // Fonts and decoders come from the app, never from the network
  function LocalData() {
    this.fetch = function (request) {
      var data = files[request.filename];
      return data ? Promise.resolve(bytes(data)) : Promise.reject(new Error('missing ' + request.filename));
    };
  }
  window.__file = function (name, base64) { files[name] = base64; };
  window.__boot = function (librarySource, workerSource) {
    import(blobUrl(librarySource)).then(function (module) {
      lib = module;
      lib.GlobalWorkerOptions.workerPort = new Worker(blobUrl(WORKER_PRELUDE + workerSource), { type: 'module' });
      send({ type: 'ready' });
    }, function (error) {
      send({ type: 'bootError', message: String((error && error.message) || error) });
    });
  };
  window.__chunk = function (id, part) { (parts[id] = parts[id] || []).push(part); };
  window.__open = function (id) {
    var data;
    try {
      data = bytes((parts[id] || []).join(''));
    } catch (error) {
      data = null;
    }
    delete parts[id];
    if (!lib || !data) return send({ type: 'openError', id: id, reason: 'invalid' });
    var task;
    try {
      task = lib.getDocument({
        data: data,
        isEvalSupported: false,
        useSystemFonts: false,
        useWorkerFetch: false,
        BinaryDataFactory: LocalData,
        standardFontDataUrl: 'local:fonts/',
        wasmUrl: 'local:wasm/',
        disableWorkerRendering: true,
        stopAtErrors: false,
      });
    } catch (error) {
      return send({ type: 'openError', id: id, reason: 'invalid' });
    }
    // A protected PDF: no prompt, only the answer "password"
    task.onPassword = function () {
      send({ type: 'openError', id: id, reason: 'password' });
      task.destroy();
    };
    task.promise.then(function (doc) {
      docs[id] = doc;
      send({ type: 'opened', id: id, pages: doc.numPages });
    }, function (error) {
      var name = error && error.name;
      send({ type: 'openError', id: id, reason: name === 'PasswordException' ? 'password' : 'invalid' });
    });
  };
  window.__render = function (id, job, pageNumber, width, quality) {
    var doc = docs[id];
    if (!doc) return send({ type: 'renderError', id: id, job: job });
    doc.getPage(pageNumber).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var viewport = page.getViewport({ scale: width / base.width });
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      var context = canvas.getContext('2d');
      // White paper under the page: a JPEG has no transparency
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      return page.render({ canvasContext: context, canvas: canvas, viewport: viewport }).promise.then(function () {
        var url = canvas.toDataURL('image/jpeg', quality);
        var size = { width: canvas.width, height: canvas.height };
        page.cleanup();
        // Frees the canvas memory at once (iOS limits the total of canvases)
        canvas.width = 0;
        canvas.height = 0;
        send({ type: 'page', id: id, job: job, data: url.slice(url.indexOf(',') + 1), width: size.width, height: size.height });
      });
    }).catch(function () {
      send({ type: 'renderError', id: id, job: job });
    });
  };
  window.__close = function (id) {
    var doc = docs[id];
    delete docs[id];
    delete parts[id];
    if (doc) doc.destroy();
  };
})();
</script>
</body></html>`;
