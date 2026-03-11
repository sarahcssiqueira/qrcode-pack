export default class GFMath {
 constructor() {
    this.initGF();
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
}