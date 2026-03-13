import GFMath from './GFMath.js';

const RS_BLOCK_TABLE = {
    1: { L: [1, 26, 19], M: [1, 26, 16], Q: [1, 26, 13], H: [1, 26, 9] },
    2: { L: [1, 44, 34], M: [1, 44, 28], Q: [1, 44, 22], H: [1, 44, 16] },
    3: { L: [1, 70, 55], M: [1, 70, 44], Q: [2, 35, 17], H: [2, 35, 13] },
    4: { L: [1, 100, 80], M: [2, 50, 32], Q: [2, 50, 24], H: [4, 25, 9] },
    5: { L: [1, 134, 108], M: [2, 67, 43], Q: [2, 33, 15, 2, 34, 16], H: [2, 33, 11, 2, 34, 12] },
    6: { L: [2, 86, 68], M: [4, 43, 27], Q: [4, 43, 19], H: [4, 43, 15] },
    7: { L: [2, 98, 78], M: [4, 49, 31], Q: [2, 32, 14, 4, 33, 15], H: [4, 39, 13, 1, 40, 14] },
    8: { L: [2, 121, 97], M: [2, 60, 38, 2, 61, 39], Q: [4, 40, 18, 2, 41, 19], H: [4, 40, 14, 2, 41, 15] },
    9: { L: [2, 146, 116], M: [3, 58, 36, 2, 59, 37], Q: [4, 36, 16, 4, 37, 17], H: [4, 36, 12, 4, 37, 13] },
    10: { L: [2, 86, 68, 2, 87, 69], M: [4, 69, 43, 1, 70, 44], Q: [6, 43, 19, 2, 44, 20], H: [6, 43, 15, 2, 44, 16] },
    11: { L: [4, 101, 81], M: [1, 80, 50, 4, 81, 51], Q: [4, 50, 22, 4, 51, 23], H: [3, 36, 12, 8, 37, 13] },
    12: { L: [2, 116, 92, 2, 117, 93], M: [6, 58, 36, 2, 59, 37], Q: [4, 46, 20, 6, 47, 21], H: [7, 42, 14, 4, 43, 15] },
    13: { L: [4, 133, 107], M: [8, 59, 37, 1, 60, 38], Q: [8, 44, 20, 4, 45, 21], H: [12, 33, 11, 4, 34, 12] },
    14: { L: [3, 145, 115, 1, 146, 116], M: [4, 64, 40, 5, 65, 41], Q: [11, 36, 16, 5, 37, 17], H: [11, 36, 12, 5, 37, 13] },
    15: { L: [5, 109, 87, 1, 110, 88], M: [5, 65, 41, 5, 66, 42], Q: [5, 54, 24, 7, 55, 25], H: [11, 36, 12, 7, 37, 13] },
};

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

    // Convert input text to UTF-8 byte array
    toUtf8Bytes(str){
        return Array.from(new TextEncoder().encode(str));
    }

    // Determine the smallest QR code version that can accommodate the input data and error correction level
    chooseVersion(){
        for(let v=1; v<=15; v++){
            const verInfo = this.versionTable[v];
            const capacityBits = verInfo[this.ecLevel] * 8;
            const lengthBits = v <= 9 ? 8 : 16;
            const requiredBits = 4 + lengthBits + (this.dataBytes.length * 8);

            if(requiredBits <= capacityBits){
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
        
        bits.push(...this.numToBits(0b0100, 4));
        
        const lengthBits = this.version <= 9 ? 8 : 16;
        bits.push(...this.numToBits(this.dataBytes.length, lengthBits));

        for (const b of this.dataBytes) bits.push(...this.numToBits(b, 8));

        const capacityBits = this.getDataCapacityBits();
        const remaining = capacityBits - bits.length;
        if (remaining > 0) {
            const term = Math.min(4, remaining);
            for (let i = 0; i < term; i++) bits.push(0);
        }
        while (bits.length % 8 !== 0) bits.push(0);
        const dataBytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            dataBytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
        }

       // 7) Pad with alternating bytes 0xec and 0x11 until we reach the total data capacity in bytes for the version and error correction level
        const totalDataBytes = this.getDataCapacityBytes();
        const pads = [0xec, 0x11];
        let padIndex = 0;
        while (dataBytes.length < totalDataBytes) {
            dataBytes.push(pads[padIndex % 2]);
            padIndex++;
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

    numToBits(num,len){
        const arr = [];
        for(let i=len-1;i>=0;i--)
            arr.push((num >> i) & 1);
        return arr;
    }

    getRSBlocks(){
        const rsEntry = RS_BLOCK_TABLE[this.version]?.[this.ecLevel];

        if(!rsEntry)
            throw new Error(`Missing RS block data for version ${this.version} ${this.ecLevel}`);

        const blocks = [];

        for(let i = 0; i < rsEntry.length; i += 3){
            const count = rsEntry[i];
            const totalCount = rsEntry[i + 1];
            const dataCount = rsEntry[i + 2];

            for(let blockIndex = 0; blockIndex < count; blockIndex++){
                blocks.push({
                    totalCount,
                    dataCount,
                    ecCount: totalCount - dataCount,
                });
            }
        }

        return blocks;
    }

    makeECC(dataBytes){
        const rsBlocks = this.getRSBlocks();
        const blockData = [];
        let offset = 0;

        for(const block of rsBlocks){
            const chunk = dataBytes.slice(offset, offset + block.dataCount);

            if(chunk.length !== block.dataCount)
                throw new Error(`Invalid data block layout for version ${this.version} ${this.ecLevel}`);

            blockData.push(chunk);
            offset += block.dataCount;
        }

        if(offset !== dataBytes.length)
            throw new Error(`Unassigned data codewords for version ${this.version} ${this.ecLevel}`);

        const eccBlocks = [];
        const generators = new Map();

        for(let b=0;b<rsBlocks.length;b++){
            const ecLen = rsBlocks[b].ecCount;
            let generator = generators.get(ecLen);

            if(!generator){
                generator = this.gfmath.makeGenerator(ecLen);
                generators.set(ecLen, generator);
            }

            const msg = blockData[b].concat(new Array(ecLen).fill(0));
            const ecc = this.gfmath.polyDiv(msg,generator);
            eccBlocks.push(ecc.slice(-ecLen));
        }

        // Interleave data bytes
        const interleaved = [];
        const maxDataLen = Math.max(...blockData.map(b=>b.length));
        for(let i=0;i<maxDataLen;i++){
            for(let b=0;b<blockData.length;b++){
                if(i < blockData[b].length)
                    interleaved.push(blockData[b][i]);
            }
        }
        // Interleave ECC bytes
        const maxEcLen = Math.max(...eccBlocks.map(block => block.length));
        for(let i=0;i<maxEcLen;i++){
            for(let b=0;b<eccBlocks.length;b++){
                if(i < eccBlocks[b].length)
                    interleaved.push(eccBlocks[b][i]);
            }
        }
        return interleaved;
    }

}