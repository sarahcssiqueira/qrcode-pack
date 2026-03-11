import QRCodeData from './src/QRCodeData.js';
import QRCodeMatrix from './src/QRCodeMatrix.js';
import QRCodeRenderer from './src/QRCodeRenderer.js';

export default class QRCodeGenerator {
  constructor(text, opts = {}) {
    this.text = text;
    this.ecLevel = (opts.ecLevel || 'H').toUpperCase();
    this.data = new QRCodeData(this.text, this.ecLevel);
    this.matrix = new QRCodeMatrix(this.data.version, 17 + 4 * this.data.version);
    this.alignPositions = this.data.versionTable[this.data.version].align;
    this.renderer = null;
  }

  buildMatrix(maskNum = 0) {
    const allCodewords = this.data.buildDataBits();
    const fullCodewords = this.data.makeECC(allCodewords);

    // Place finder patterns
    this.matrix.placeFinderPattern(0, 0);
    this.matrix.placeFinderPattern(this.matrix.size - 7, 0);
    this.matrix.placeFinderPattern(0, this.matrix.size - 7);

    // Place separators, timing patterns, and alignment patterns
    this.matrix.placeSeparators();
    this.matrix.placeTimingPatterns();
    this.matrix.placeAlignmentPatterns(this.alignPositions);
    this.matrix.reserveFormatAndVersionAreas();

    // Place data bits and apply mask
    this.matrix.placeDataBits(fullCodewords);
    this.matrix.applyMask(maskNum);
    this.matrix.writeFormatBits(this.ecLevel, maskNum);

    return this.matrix.modules;
  }

  // Render the QR code to a canvas element
  renderToCanvas(canvasId) {
    this.renderer = new QRCodeRenderer(this.matrix.modules);
    this.renderer.renderToCanvas(canvasId);
  }
}