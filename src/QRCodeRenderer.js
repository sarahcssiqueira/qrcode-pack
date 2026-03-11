export default class QRCodeRenderer {
  constructor(matrix) { this.modules = matrix; this.size = matrix.length; }

  // Render the QR code matrix to a canvas element with specified pixel size and margin, 
  // ensuring crisp rendering on high-DPI displays
  renderToCanvas(canvasId, pixelSize = 512, marginModules = 4) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) throw new Error('Canvas not found');
    const moduleCount = this.size;
    const totalModules = moduleCount + marginModules * 2;
    const cell = Math.floor(pixelSize / totalModules);
    const actualSize = cell * totalModules;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    canvas.style.width = `${actualSize}px`;
    canvas.style.height = `${actualSize}px`;
    canvas.width = Math.max(1, Math.floor(actualSize * dpr));
    canvas.height = Math.max(1, Math.floor(actualSize * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (typeof ctx.imageSmoothingEnabled !== 'undefined') ctx.imageSmoothingEnabled = false;
    try { canvas.style.imageRendering = 'pixelated'; } catch (e) {}

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, actualSize, actualSize);
    const offset = marginModules * cell;
    for (let y = 0; y < moduleCount; y++) for (let x = 0; x < moduleCount; x++) {
      ctx.fillStyle = this.modules[y][x] ? '#000' : '#fff';
      ctx.fillRect(offset + x * cell, offset + y * cell, cell, cell);
    }
  }
}