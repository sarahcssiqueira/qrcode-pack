export default class QRCodeMatrix {
  constructor(version, size) {
    this.version = version;
    this.size = size;
    this.modules = Array.from({ length: size }, () => Array(size).fill(null));
    this.reserved = Array.from({ length: size }, () => Array(size).fill(false));
  }

  // Functions to place patterns and data in the matrix according to QR code specification
  placeFinderPattern(x, y) {
    const p = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
      this.modules[y + dy][x + dx] = p[dy][dx];
      this.reserved[y + dy][x + dx] = true;
    }
  }

  // Place separators (white modules) around finder patterns
  placeSeparators() {
    const s = this.size;
    // top-left
    for (let i = 0; i < 8; i++) { this.modules[7][i] = 0; this.reserved[7][i] = true; this.modules[i][7] = 0; this.reserved[i][7] = true; }
    // top-right
    for (let i = 0; i < 8; i++) { this.modules[7][s - 1 - i] = 0; this.reserved[7][s - 1 - i] = true; this.modules[i][s - 8] = 0; this.reserved[i][s - 8] = true; }
    // bottom-left
    for (let i = 0; i < 8; i++) { this.modules[s - 8][i] = 0; this.reserved[s - 8][i] = true; this.modules[s - 1 - i][7] = 0; this.reserved[s - 1 - i][7] = true; }
  }

  // Place timing patterns (alternating black and white modules) between finder patterns
  placeTimingPatterns() {
    for (let i = 8; i < this.size - 8; i++) {
      if (!this.reserved[6][i]) { this.modules[6][i] = i % 2; this.reserved[6][i] = true; }
      if (!this.reserved[i][6]) { this.modules[i][6] = i % 2; this.reserved[i][6] = true; }
    }
  }

  // Place alignment patterns based on version-specific positions, avoiding overlaps with finder patterns
  placeAlignmentPatterns(alignPositions) {
    if (!alignPositions || alignPositions.length === 0) return;
    for (let ay = 0; ay < alignPositions.length; ay++) {
      for (let ax = 0; ax < alignPositions.length; ax++) {
        const x = alignPositions[ax], y = alignPositions[ay];
        const overlapsFinder = (x <= 8 && y <= 8) || (x >= this.size - 9 && y <= 8) || (x <= 8 && y >= this.size - 9);
        if (overlapsFinder) continue;
        this.placeAlignmentPatternAt(x - 2, y - 2);
      }
    }
  }

  // Place a single 5x5 alignment pattern at the specified coordinates
  placeAlignmentPatternAt(x, y) {
    const pat = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 5; dx++) {
      this.modules[y + dy][x + dx] = pat[dy][dx];
      this.reserved[y + dy][x + dx] = true;
    }
  }

  // Reserve areas for format and version information, which will be filled later
  reserveFormatAndVersionAreas() {
    const n = this.size;
    for (let i = 0; i < 9; i++) {
      if (i !== 6) { this.reserved[8][i] = true; this.reserved[i][8] = true; }
    }
    for (let i = 0; i < 8; i++) {
      this.reserved[n - 1 - i][8] = true; // bottom-left
      this.reserved[8][n - 1 - i] = true; // top-right
    }
    this.modules[8][n - 8] = 1;
    this.reserved[8][n - 8] = true;
  }

  // Place data bits in the matrix in a zig-zag pattern, skipping reserved areas, and applying the mask
  placeDataBits(allBytes){
    const bits = [];
    for(const b of allBytes) for(let i=7;i>=0;i--) bits.push((b>>i)&1);
    let bitIndex = 0;
    let dirUp = true;
    let x = this.size - 1;
    let y;
    while(x > 0){
      if(x === 6) x--; // skip vertical timing
      for(let i=0;i<this.size;i++){
        const row = dirUp ? (this.size - 1 - i) : i;
        for(let colOffset=0; colOffset<2; colOffset++){
          const cx = x - colOffset;
          const cy = row;
          if(!this.reserved[cy][cx]){
            const bit = bitIndex < bits.length ? bits[bitIndex++] : 0;
            this.modules[cy][cx] = bit;
          }
        }
      }
      x -= 2;
      dirUp = !dirUp;
    }
  }

  // Apply the specified mask pattern to the data modules, skipping reserved areas
  applyMask(maskNum) {
    const n = this.size;
    const out = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => this.modules[y][x]));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (this.reserved[y][x]) continue;
      let mask;
      switch(maskNum){
        case 0: mask = (y + x) % 2 === 0; break;
        case 1: mask = y % 2 === 0; break;
        case 2: mask = x % 3 === 0; break;
        case 3: mask = (y + x) % 3 === 0; break;
        case 4: mask = (Math.floor(y/2) + Math.floor(x/3)) % 2 === 0; break;
        case 5: mask = ((y*x) % 2) + ((y*x) % 3) === 0; break;
        case 6: mask = (((y*x) % 2) + ((y*x) % 3)) % 2 === 0; break;
        case 7: mask = (((y + x) % 2) + ((y*x) % 3)) % 2 === 0; break;
        default: mask = false;
      }
      if(mask) out[y][x] ^= 1;
    }
    this.modules = out;
  }

  // Format bits are calculated based on error correction level and mask pattern, then placed in reserved areas
  getFormatBits(ecLevel, maskNum) {
    const ecMap = {L:1, M:0, Q:3, H:2};
    const formatInfo = ((ecMap[ecLevel] & 0x3) << 3) | (maskNum & 0x7);
    let data = formatInfo << 10;
    const generator = 0x537;
    for (let i = 14; i >= 10; i--) if ((data >> i) & 1) data ^= (generator << (i - 10));
    const formatBits = ((formatInfo << 10) | (data & 0x3FF)) ^ 0x5412;
    const bits = [];
    for (let i = 14; i >= 0; i--) bits.push((formatBits >> i) & 1);
    return bits;
  }

  // Write the format bits to their reserved positions in the matrix, ensuring they are marked as reserved
  writeFormatBits(ecLevel, maskNum) {
    const bits = this.getFormatBits(ecLevel, maskNum);
    const n = this.size;

    // first copy top-left
    const order1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8]];
    for (let i = 0; i < 15; i++) { const [r,c] = order1[i]; this.modules[r][c] = bits[i]; this.reserved[r][c] = true; }

    // second copy top-right and bottom-left
    const order2 = [];
    for (let i = 0; i < 7; i++) order2.push([n-1-i, 8]);
    for (let i = 7; i < 15; i++) order2.push([8, n-15+i]);
    for (let i = 0; i < 15; i++) { const [r,c] = order2[i]; this.modules[r][c] = bits[i]; this.reserved[r][c] = true; }
  }
}