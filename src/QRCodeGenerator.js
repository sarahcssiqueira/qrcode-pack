export default class QRCodeGenerator {
  constructor(text, opts = {}) {
    this.text = text;
    this.ecLevel = (opts.ecLevel || 'H').toUpperCase();
    this.version = null;
    this.modules = null;
    this.reserved = null;
    // corrected tables: L/M/Q/H are data codewords (totalCodewords - ecCodewordsPerBlock)
    // Extended versionTable up to version 15 for even longer data support
    this.versionTable = {
      1:  { L: 19,  M: 16,  Q: 13,  H: 9,  align: [],        totalCodewords: 26,  ecCodewordsPerBlock: {L:7,  M:10, Q:13, H:17}, blocks: {L:1, M:1, Q:1, H:1} },
      2:  { L: 34,  M: 28,  Q: 22,  H: 16, align: [6, 18],   totalCodewords: 44,  ecCodewordsPerBlock: {L:10, M:16, Q:22, H:28}, blocks: {L:1, M:1, Q:1, H:1} },
      3:  { L: 55,  M: 44,  Q: 34,  H: 26, align: [6, 22],   totalCodewords: 70,  ecCodewordsPerBlock: {L:15, M:26, Q:36, H:44}, blocks: {L:1, M:1, Q:2, H:2} },
      4:  { L: 80,  M: 64,  Q: 48,  H: 36, align: [6, 26],   totalCodewords: 100, ecCodewordsPerBlock: {L:20, M:36, Q:52, H:64}, blocks: {L:1, M:2, Q:2, H:4} },
      5:  { L: 108, M: 86,  Q: 62,  H: 46, align: [6, 30],   totalCodewords: 134, ecCodewordsPerBlock: {L:26, M:48, Q:72, H:88}, blocks: {L:1, M:2, Q:2, H:2} },
      6:  { L: 136, M: 108, Q: 76,  H: 60, align: [6, 34],   totalCodewords: 172, ecCodewordsPerBlock: {L:36, M:64, Q:96, H:112}, blocks: {L:2, M:4, Q:4, H:4} },
      7:  { L: 156, M: 124, Q: 88,  H: 66, align: [6, 22, 38], totalCodewords: 196, ecCodewordsPerBlock: {L:40, M:72, Q:108, H:130}, blocks: {L:2, M:4, Q:6, H:6} },
      8:  { L: 194, M: 154, Q: 110, H: 86, align: [6, 24, 42], totalCodewords: 242, ecCodewordsPerBlock: {L:48, M:88, Q:132, H:156}, blocks: {L:2, M:4, Q:6, H:6} },
      9:  { L: 232, M: 182, Q: 132, H: 100, align: [6, 26, 46], totalCodewords: 292, ecCodewordsPerBlock: {L:60, M:110, Q:160, H:192}, blocks: {L:2, M:5, Q:8, H:8} },
      10: { L: 274, M: 216, Q: 154, H: 122, align: [6, 28, 50], totalCodewords: 346, ecCodewordsPerBlock: {L:72, M:130, Q:192, H:224}, blocks: {L:4, M:5, Q:8, H:8} },
      11: { L: 324, M: 254, Q: 180, H: 140, align: [6, 30, 54], totalCodewords: 404, ecCodewordsPerBlock: {L:80, M:150, Q:224, H:264}, blocks: {L:4, M:5, Q:10, H:10} },
      12: { L: 370, M: 290, Q: 206, H: 158, align: [6, 32, 58], totalCodewords: 466, ecCodewordsPerBlock: {L:96, M:176, Q:260, H:308}, blocks: {L:4, M:8, Q:12, H:12} },
      13: { L: 428, M: 334, Q: 244, H: 180, align: [6, 34, 62], totalCodewords: 532, ecCodewordsPerBlock: {L:104, M:198, Q:288, H:352}, blocks: {L:4, M:9, Q:16, H:16} },
      14: { L: 461, M: 365, Q: 261, H: 197, align: [6, 26, 46, 66], totalCodewords: 581, ecCodewordsPerBlock: {L:120, M:216, Q:320, H:384}, blocks: {L:4, M:9, Q:16, H:16} },
      15: { L: 523, M: 415, Q: 295, H: 223, align: [6, 26, 48, 70], totalCodewords: 655, ecCodewordsPerBlock: {L:132, M:240, Q:360, H:432}, blocks: {L:6, M:10, Q:18, H:18} },
    };
    this.initGF();
    this.dataBytes = this.toUtf8Bytes(this.text);
    this.chooseVersion();
    this.size = 17 + 4 * this.version;
    this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    this.reserved = Array.from({ length: this.size }, () => Array(this.size).fill(false));
  }

  // GF init + helpers
  initGF() {
    const exp = new Array(512);
    const log = new Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x;
      log[x] = i;
      x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
      x &= 0xff;
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    this.gfExp = exp;
    this.gfLog = log;
  }
  gfAdd(a,b){ return a ^ b; }
  gfMul(a,b){ if(a===0||b===0) return 0; return this.gfExp[(this.gfLog[a]+this.gfLog[b])%255]; }
  makeGenerator(ecLen){
    let gen=[1];
    for(let i=0;i<ecLen;i++){ gen = this.polyMul(gen,[1,this.gfExp[i]]); }
    return gen;
  }
  polyMul(a,b){
    const res = new Array(a.length + b.length -1).fill(0);
    for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) res[i+j] ^= this.gfMul(a[i], b[j]);
    return res;
  }
  polyDiv(message, generator){
    const msg = message.slice();
    for(let i=0;i<=message.length - generator.length;i++){
      const coef = msg[i];
      if(coef !== 0) {
        for (let j = 1; j < generator.length; j++) msg[i+j] ^= this.gfMul(generator[j], coef);
      }
    }
    return msg.slice(message.length - (generator.length - 1));
  }

  toUtf8Bytes(str) { return Array.from(new TextEncoder().encode(str)); }

  // Data bit building
  buildDataBits(){
    const bits = [];
    bits.push(...this.numToBits(0b0100, 4)); // byte mode
    const lengthBits = this.version <= 9 ? 8 : 16;
    bits.push(...this.numToBits(this.dataBytes.length, lengthBits));
    for(const b of this.dataBytes) bits.push(...this.numToBits(b,8));
    const capacityBits = this.getDataCapacityBits();
    const remaining = capacityBits - bits.length;
    if(remaining > 0) {
      const term = Math.min(4, remaining);
      for(let i=0;i<term;i++) bits.push(0);
    }
    while(bits.length % 8 !== 0) bits.push(0);
    const dataBytes = [];
    for(let i=0;i<bits.length;i+=8) dataBytes.push(parseInt(bits.slice(i,i+8).join(''),2));
    const totalDataBytes = this.getDataCapacityBytes();
    const pads = [0xec, 0x11];
    let padIndex = 0;
    while(dataBytes.length < totalDataBytes) dataBytes.push(pads[padIndex++ % 2]);
    return dataBytes;
  }
  numToBits(num,len){ const a=[]; for(let i=len-1;i>=0;i--) a.push((num>>i)&1); return a; }
  // Use the capacity (bytes) precomputed in versionTable for byte mode
  getDataCapacityBits(){ const verInfo = this.versionTable[this.version]; const dataBytes = verInfo[this.ecLevel]; return dataBytes * 8; }
  getDataCapacityBytes(){ const verInfo = this.versionTable[this.version]; return verInfo[this.ecLevel]; }
  chooseVersion(){
  // Now supports up to version 15
  for(let v=1; v<=15; v++){
      const cap = this.versionTable[v][this.ecLevel];
      if(this.dataBytes.length <= cap){
        this.version = v;
        return;
      }
    }
    throw new Error('Data too long for versions 1..10');
  }

  // ECC
  makeECC(dataBytes){
    const ver = this.versionTable[this.version];
    const total = ver.totalCodewords;
    const blocks = ver.blocks[this.ecLevel];
    const dataCodewords = dataBytes.length; // already padded to capacity
    // split data bytes across blocks as evenly as spec requires (distribute remainders to first blocks)
    const baseDataLen = Math.floor(dataCodewords / blocks);
    const dataRemainder = dataCodewords % blocks;
    const blockData = [];
    let offset = 0;
    for(let b=0;b<blocks;b++){
      const len = baseDataLen + (b < dataRemainder ? 1 : 0);
      blockData.push(dataBytes.slice(offset, offset + len));
      offset += len;
    }

    // ECC per block is specified in the table (same for all blocks for v1..v4)
    const eccBlocks = [];
    const ecLen = ver.ecCodewordsPerBlock[this.ecLevel];
    for(let b=0;b<blocks;b++){
      const generator = this.makeGenerator(ecLen);
      const msg = blockData[b].concat(new Array(generator.length - 1).fill(0));
      const ecc = this.polyDiv(msg, generator);
      eccBlocks.push(ecc.slice(-ecLen));
    }

    // interleave data bytes
    const interleaved = [];
    const maxDataLen = Math.max(...blockData.map(b=>b.length));
    for(let i=0;i<maxDataLen;i++){
      for(let b=0;b<blockData.length;b++){
        if(i < blockData[b].length) interleaved.push(blockData[b][i]);
      }
    }
    // interleave ecc bytes
    const maxEcLen = Math.max(...eccBlocks.map(b=>b.length));
    for(let i=0;i<maxEcLen;i++){
      for(let b=0;b<eccBlocks.length;b++){
        if(i < eccBlocks[b].length) interleaved.push(eccBlocks[b][i]);
      }
    }
    return interleaved;
  }

  // Function patterns
  placeFinderPattern(x,y){
    const p = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    for(let dy=0; dy<7; dy++) for(let dx=0; dx<7; dx++){
      this.modules[y+dy][x+dx] = p[dy][dx];
      this.reserved[y+dy][x+dx] = true;
    }
  }

  // Separators: explicitly set to 0 and reserve them
  placeSeparators(){
    const s = this.size;
    // top-left separator (row 7 col 0..7 and col 7 row 0..7)
    for(let i=0;i<8;i++){ this.modules[7][i] = 0; this.reserved[7][i] = true; this.modules[i][7] = 0; this.reserved[i][7] = true; }
    // top-right (row 7, cols s-8..s-1) and (cols s-8 row 0..7)
    for(let i=0;i<8;i++){ this.modules[7][s-1-i] = 0; this.reserved[7][s-1-i] = true; this.modules[i][s-8] = 0; this.reserved[i][s-8] = true; }
    // bottom-left
    for(let i=0;i<8;i++){ this.modules[s-8][i] = 0; this.reserved[s-8][i] = true; this.modules[s-1-i][7] = 0; this.reserved[s-1-i][7] = true; }
  }

  placeTimingPatterns(){
    for(let i=8;i<this.size-8;i++){
      const v = (i % 2 === 0) ? 1 : 0;
      if(!this.reserved[6][i]){ this.modules[6][i] = v; this.reserved[6][i] = true; }
      if(!this.reserved[i][6]){ this.modules[i][6] = v; this.reserved[i][6] = true; }
    }
  }

  placeAlignmentPatterns(){
    const align = this.versionTable[this.version].align;
    if(!align || align.length===0) return;
    for(let ay=0; ay<align.length; ay++){
      for(let ax=0; ax<align.length; ax++){
        const x = align[ax], y = align[ay];
        const overlapsFinder = (x <= 8 && y <= 8) || (x >= this.size - 9 && y <= 8) || (x <= 8 && y >= this.size - 9);
        if(overlapsFinder) continue;
        this.placeAlignmentPatternAt(x-2, y-2);
      }
    }
  }
  placeAlignmentPatternAt(x,y){
    const pat = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    for(let dy=0; dy<5; dy++) for(let dx=0; dx<5; dx++){
      this.modules[y+dy][x+dx] = pat[dy][dx];
      this.reserved[y+dy][x+dx] = true;
    }
  }

  reserveFormatAndVersionAreas(){
    const n = this.size;
    // reserve the 9x9 top-left area lines (excluding timing at 6 which already reserved)
    for(let i=0;i<9;i++){
      if(i !== 6){ this.reserved[8][i] = true; this.reserved[i][8] = true; }
    }
    // reserve the format info near top-right and bottom-left
    for(let i=0;i<8;i++){
      this.reserved[n-1 - i][8] = true; // bottom-left vertical
      this.reserved[8][n-1 - i] = true; // top-right horizontal
    }
    // dark module position (fixed dark module) per spec: (8, n-8) should be dark (1)
    this.modules[8][n-8] = 1;
    this.reserved[8][n-8] = true;
  }

  // Data placement
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

  // Masking, scoring
  applyMask(maskNum, matrixIn){
    const n = this.size;
    const out = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => matrixIn[y][x]));
    for(let y=0;y<n;y++){
      for(let x=0;x<n;x++){
        if(this.reserved[y][x]) continue;
        const v = out[y][x];
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
        if(mask) out[y][x] = v ^ 1;
      }
    }
    return out;
  }
  penaltyScore(mat){
    const n = this.size;
    let score = 0;
    // Rule 1 (rows)
    for(let y=0;y<n;y++){
      let runColor = mat[y][0], runLen = 1;
      for(let x=1;x<n;x++){
        if(mat[y][x] === runColor) runLen++; else { if(runLen >= 5) score += 3 + (runLen - 5); runColor = mat[y][x]; runLen = 1; }
      }
      if(runLen >= 5) score += 3 + (runLen - 5);
    }
    // Rule 1 (cols)
    for(let x=0;x<n;x++){
      let runColor = mat[0][x], runLen = 1;
      for(let y=1;y<n;y++){
        if(mat[y][x] === runColor) runLen++; else { if(runLen >= 5) score += 3 + (runLen - 5); runColor = mat[y][x]; runLen = 1; }
      }
      if(runLen >= 5) score += 3 + (runLen - 5);
    }
    // Rule 2: 2x2 blocks
    for(let y=0;y<n-1;y++) for(let x=0;x<n-1;x++){ const v = mat[y][x]; if(mat[y][x+1]===v && mat[y+1][x]===v && mat[y+1][x+1]===v) score += 3; }
    // Rule 3: pattern 1011101 with 4 light modules either side (rows & cols)
    const pattern1 = [1,0,1,1,1,0,1];
    for(let y=0;y<n;y++){
      for(let x=0;x<n-6;x++){
        const slice = mat[y].slice(x,x+7);
        if(this.arrEquals(slice, pattern1)){
          const leftClear = x-4 >= 0 ? mat[y].slice(x-4,x).every(v=>v===0) : x===0;
          const rightClear = x+7+4 <= n ? mat[y].slice(x+7,x+11).every(v=>v===0) : x+7===n;
          if(leftClear || rightClear) score += 40;
        }
      }
    }
    for(let x=0;x<n;x++){
      for(let y=0;y<n-6;y++){
        const col=[]; for(let k=0;k<7;k++) col.push(mat[y+k][x]);
        if(this.arrEquals(col, pattern1)){
          const topClear = y-4 >=0 ? (()=>{ for(let k=y-4;k<y;k++) if(mat[k][x]!==0) return false; return true; })() : y===0;
          const botClear = y+7+4 <= n ? (()=>{ for(let k=y+7;k<y+11;k++) if(mat[k][x]!==0) return false; return true; })() : y+7===n;
          if(topClear || botClear) score += 40;
        }
      }
    }
    // Rule 4: dark module ratio
    let dark = 0; for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(mat[y][x]===1) dark++;
    const total = n*n;
    const percent = (dark*100)/total;
    const prevMultipleOfFive = Math.abs(Math.round(percent/5)*5 - 50)/5;
    score += prevMultipleOfFive * 10;
    return score;
  }
  arrEquals(a,b){ if(a.length !== b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

  // Format bits: compute and write in spec positions correctly
  getFormatBits(maskNum){
    const ecMap = {L:1, M:0, Q:3, H:2};
    const formatInfo = ((ecMap[this.ecLevel] & 0x3) << 3) | (maskNum & 0x7);
    let data = formatInfo << 10;
    const generator = 0x537;
    for(let i=14;i>=10;i--){
      if((data >> i) & 1) data ^= (generator << (i - 10));
    }
    const formatBits = ((formatInfo << 10) | (data & 0x3FF)) ^ 0x5412;
    const bits = [];
    for(let i=14;i>=0;i--) bits.push((formatBits >> i) & 1);
    return bits;
  }

  writeFormatBits(mat, maskNum){
    const bits = this.getFormatBits(maskNum);
    const n = this.size;
    // positions per spec (first copy around top-left)
    const pos1 = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
      [7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8]
    ];
    // However the standard order for the 15 bits is specific: we'll follow
    // spec order: (row,col) sequence mapped to bits[0..14]
    const order1 = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8]
    ];
    for(let i=0;i<15;i++){
      const [r,c] = order1[i];
      mat[r][c] = bits[i];
      this.reserved[r][c] = true;
    }
    // second copy: top-right and bottom-left (mirror)
    const order2 = [];
    // bottom-left vertical (from bottom up)
    for(let i=0;i<7;i++) order2.push([n-1 - i, 8]); // 0..6
    // top-right horizontal (from right to left)
    for(let i=7;i<15;i++) order2.push([8, n - 15 + i]); // 7..14 mapping
    // write second copy using same bits order
    for(let i=0;i<15;i++){
      const [r,c] = order2[i];
      mat[r][c] = bits[i];
      this.reserved[r][c] = true;
    }
  }

  // Build matrix: orchestrates steps and mask selection
  buildMatrix(){
    const dataBytes = this.buildDataBits();
    const allCodewords = this.makeECC(dataBytes);
    // place function patterns
    this.placeFinderPattern(0,0);
    this.placeFinderPattern(this.size - 7, 0);
    this.placeFinderPattern(0, this.size - 7);
    this.placeSeparators();
    this.placeTimingPatterns();
    this.placeAlignmentPatterns();
    this.reserveFormatAndVersionAreas();
    // place data
    this.placeDataBits(allCodewords);
    // choose mask
    let bestMask = 0, bestScore = Infinity, bestMat = null;
    for(let m=0;m<8;m++){
      const masked = this.applyMask(m, this.modules);
      const copy = masked.map(r=>r.slice());
      this.writeFormatBits(copy, m);
      const score = this.penaltyScore(copy);
      if(score < bestScore){ bestScore = score; bestMask = m; bestMat = copy; }
    }
    // finalize: fill nulls with 0
    for(let y=0;y<this.size;y++) for(let x=0;x<this.size;x++) if(bestMat[y][x] === null || typeof bestMat[y][x] === 'undefined') bestMat[y][x] = 0;
    this.modules = bestMat;
    return this.modules;
  }

  // Crisp renderer: integer cell size, disable smoothing, enforce quiet zone
  renderToCanvas(canvasId, pixelSize = 512, marginModules = 4){
    const canvas = document.getElementById(canvasId);
    if(!canvas) throw new Error('Canvas not found');
    const moduleCount = this.size;
    // Treat marginModules as a count of modules (per spec the quiet zone is 4 modules).
    // total modules including margins on both sides
    const totalModules = moduleCount + marginModules * 2;
    // compute integer cell size (pixels per module)
    const cell = Math.floor(pixelSize / totalModules);
    if(cell < 1) throw new Error('pixelSize too small for QR code and margin');
    const actualSize = cell * totalModules;
    // handle high-DPI displays: set CSS size and backing store size, then scale
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    // CSS size (unscaled) to keep layout consistent
    canvas.style.width = `${actualSize}px`;
    canvas.style.height = `${actualSize}px`;
    // backing store size in device pixels
    canvas.width = Math.max(1, Math.floor(actualSize * dpr));
    canvas.height = Math.max(1, Math.floor(actualSize * dpr));
    const ctx = canvas.getContext('2d');
    // scale drawing operations so we can use CSS-pixel coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // crisp pixels
    if (typeof ctx.imageSmoothingEnabled !== 'undefined') ctx.imageSmoothingEnabled = false;
    try { canvas.style.imageRendering = 'pixelated'; } catch (e) {}
    // fill background white (use CSS pixel coords)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, actualSize, actualSize);
    // offset in CSS pixels (marginModules is modules, so multiply by cell)
    const offset = marginModules * cell;
    for(let y=0;y<moduleCount;y++){
      for(let x=0;x<moduleCount;x++){
        ctx.fillStyle = this.modules[y][x] ? '#000' : '#fff';
        // draw using CSS-pixel coordinates; canvas is already scaled by DPR
        ctx.fillRect(offset + x*cell, offset + y*cell, cell, cell);
      }
    }
  }
}