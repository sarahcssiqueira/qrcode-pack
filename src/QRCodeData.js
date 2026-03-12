import GFMath from './GFMath.js';

export default class QRCodeData {
    constructor(text, opts = {}) {
        this.text = text;
        this.ecLevel = (opts.ecLevel || 'H').toUpperCase();
        this.dataBytes = this.toUtf8Bytes(this.text);
        this.version = null;
        this.modules = null;
        this.reserved = null;
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
        this.chooseVersion();
        this.size = 17 + 4 * this.version;
        this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(null));
        this.reserved = Array.from({ length: this.size }, () => Array(this.size).fill(false));

        // Initialize GF(256) math for ECC calculations
        this.gfmath = new GFMath(); 
        
    }

    toUtf8Bytes(str) { return Array.from(new TextEncoder().encode(str)); }

    // Choose the smallest version that can fit the data for the given error correction level
    chooseVersion() {
        for (let v = 1; v <= 15; v++) {
            const verInfo = this.versionTable[v];
            const capacityBytes = verInfo[this.ecLevel];
            // For simplicity, we only support byte mode and use the precomputed capacity in bytes from the version table
            if (this.dataBytes.length <= capacityBytes) {
                this.version = v;
                return;
            }
        }
        throw new Error('Data too long for versions 1..15');
    }

    // Build the data bits array according to QR code specification, 
    // including mode indicator, length, data, terminator, padding, and interleaving
    buildDataBits() {
        const bits = [];
        
        // 1) Byte mode mode indicator is 4 bits: 0100
        bits.push(...this.numToBits(0b0100, 4));
        
        // 2) Length of data in bytes (8 bits for v1..v9, 16 bits for v10..v15)
        const lengthBits = this.version <= 9 ? 8 : 16;
        bits.push(...this.numToBits(this.dataBytes.length, lengthBits));

        // 3) Data bytes in binary
        for (const b of this.dataBytes) bits.push(...this.numToBits(b, 8));

        // 4) Terminator (up to 4 bits of 0)
        const capacityBits = this.getDataCapacityBits();
        const remaining = capacityBits - bits.length;
        if (remaining > 0) {
            const term = Math.min(4, remaining);
            for (let i = 0; i < term; i++) bits.push(0);
        }

        // 5) Pad with 0s to next byte if not already byte-aligned
        while (bits.length % 8 !== 0) bits.push(0);

        // 6) Convert bits to bytes
        const dataBytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            dataBytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
        }

       // 7) Pad with alternating bytes 0xec and 0x11 until we reach the total data capacity in bytes for the version and error correction level
        const totalDataBytes = this.getDataCapacityBytes();
        const pads = [0xec, 0x11];
        let padIndex = 0;
        while (dataBytes.length < totalDataBytes) {
            dataBytes.push(pads[padIndex++ % 2]);
        }

        return dataBytes;
    }

    // Return data capacity in bits for the current version and error correction level
    getDataCapacityBits() {
        const verInfo = this.versionTable[this.version];
        return verInfo[this.ecLevel] * 8;
    }

    // Return data capacity in bytes for the current version and error correction level
    getDataCapacityBytes() {
        const verInfo = this.versionTable[this.version];
        return verInfo[this.ecLevel];
    }

    numToBits(num,len){ const a=[]; for(let i=len-1;i>=0;i--) a.push((num>>i)&1); return a; }
    // Use the capacity (bytes) precomputed in versionTable for byte mode
    getDataCapacityBits(){ const verInfo = this.versionTable[this.version]; const dataBytes = verInfo[this.ecLevel]; return dataBytes * 8; }
    getDataCapacityBytes(){ const verInfo = this.versionTable[this.version]; return verInfo[this.ecLevel]; }

    // ECC (Error Correction Code) generation using Reed-Solomon algorithm over GF(256)
    makeECC(dataBytes){
        const ver = this.versionTable[this.version];
        const total = ver.totalCodewords;
        const blocks = ver.blocks[this.ecLevel];
        const dataCodewords = dataBytes.length;
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
        const generator = this.gfmath.makeGenerator(ecLen);
        const msg = blockData[b].concat(new Array(generator.length - 1).fill(0));
        const ecc = this.gfmath.polyDiv(msg, generator);
        eccBlocks.push(ecc.slice(-ecLen));
        }

        // Interleave data bytes
        const interleaved = [];
        const maxDataLen = Math.max(...blockData.map(b=>b.length));
        for(let i=0;i<maxDataLen;i++){
        for(let b=0;b<blockData.length;b++){
            if(i < blockData[b].length) interleaved.push(blockData[b][i]);
        }
        }
        // Interleave ECC bytes
        const maxEcLen = Math.max(...eccBlocks.map(b=>b.length));
        for(let i=0;i<maxEcLen;i++){
        for(let b=0;b<eccBlocks.length;b++){
            if(i < eccBlocks[b].length) interleaved.push(eccBlocks[b][i]);
        }
        }
        return interleaved;
    }

}