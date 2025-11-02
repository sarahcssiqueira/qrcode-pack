export default class QRCodeGenerator {
  constructor(text) {
    this.text = text;
    this.binaryData = this.textToBinary(text);
    this.size = this.getMatrixSize(this.binaryData.length);
    this.matrix = this.createEmptyMatrix(this.size);
  }

  // Convert text to binary string
  textToBinary(text) {
    return text
      .split('')
      .map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0'))
      .join('');
  }

  // Simplified matrix size calculation
  getMatrixSize(dataLength) {
    return Math.ceil(Math.sqrt(dataLength)) + 10;
  }

  // Create empty matrix
  createEmptyMatrix(size) {
    return Array.from({ length: size }, () => Array(size).fill(null));
  }

  // Add finder pattern at x, y
  addFinderPattern(x, y) {
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 7; j++)
        this.matrix[y + i][x + j] = pattern[i][j];
  }

  // Fill binary data into the matrix row by row
  fillData() {
    let bitIndex = 0;
    for (let y = 0; y < this.matrix.length; y++) {
      for (let x = 0; x < this.matrix[y].length; x++) {
        if (this.matrix[y][x] === null) {
          this.matrix[y][x] = this.binaryData[bitIndex] === '1' ? 1 : 0;
          bitIndex++;
          if (bitIndex >= this.binaryData.length) return;
        }
      }
    }
  }

  // Generate the QR code matrix
  buildMatrix() {
    this.addFinderPattern(0, 0);
    this.addFinderPattern(this.size - 7, 0);
    this.addFinderPattern(0, this.size - 7);
    this.fillData();
    return this.matrix;
  }

  // Optional: render on canvas
  renderCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / this.size;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        ctx.fillStyle = this.matrix[y][x] ? 'black' : 'white';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}
