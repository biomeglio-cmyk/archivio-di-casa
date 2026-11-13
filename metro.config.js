// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pdf.js, its worker, fonts and decoders ship as plain assets (scripts/copy-pdfjs.js): read as
// text or bytes at run time and handed to the hidden WebView that draws PDFs, never bundled as code
config.resolver.assetExts.push('pdfasset');

module.exports = config;
