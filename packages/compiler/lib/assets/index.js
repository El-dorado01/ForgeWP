export {
  AssetGraph,
  AssetNode,
  scanAssetGraph,
  classifyAssetSource,
} from './asset-graph.js';

export {
  DEFAULT_RESPONSIVE_WIDTHS,
  getImageMetadata,
  generateBlurPlaceholder,
  computeImageHash,
  generateResponsiveVariants,
  optimizeImageFile,
  ImageOptimizationCache,
} from './image-optimizer.js';

export {
  RASTER_EXTENSIONS,
  resolveLocalAssetPath,
  runAssetPipeline,
} from './asset-pipeline.js';

export {
  generatePreloadTags,
} from './preload-generator.js';

export {
  computeUrlHash,
  fetchExternalImage,
  processExternalBuildOptimizations,
} from './external-fetcher.js';

export {
  normalizeFontFamilies,
  fetchGoogleFontCss,
  parseFontFaceRules,
  downloadFontFiles,
  generateLocalFontFaceCss,
  orchestrateFonts,
} from './font-orchestrator.js';

export {
  scanFontWeightUsage,
  detectUnusedFontWeights,
} from './font-usage-scanner.js';

export {
  generateAssetManifest,
  printAssetDiagnosticsReport,
} from './diagnostics-report.js';
