import { PcapData } from '../types/index';

export class HexCanvasRenderer {
  static async draw(canvas: HTMLCanvasElement, lines: string[][], lineStart: number = 0) {
    // 1. 保证字体加载
    const win = window as unknown as { fonts?: { ready: Promise<void> } };
    const doc = document as unknown as { fonts?: { ready: Promise<void> } };
    if (win.fonts && win.fonts.ready) {
      await win.fonts.ready;
    } else if (doc.fonts && doc.fonts.ready) {
      await doc.fonts.ready;
    }
    const fontSize = 12; // px，与HTML一致
    const lineHeight = 28; // 行高调整为28
    const fontFamily = 'JetBrains Mono, Consolas, Monaco, Courier New, monospace';
    // 2. 动态获取父容器宽度
    const parent = canvas.parentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = parent ? parent.clientWidth : 638;
    // 3. 用等宽字体测量各区块宽度
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let charWidth = 8, hexByteWidth = 24, hexGroupGap = 16, asciiWidth = 200, asciiGap = 16, offsetWidth = 80;
    if (tempCtx) {
      tempCtx.font = `${fontSize}px ${fontFamily}`;
      charWidth = tempCtx.measureText('0').width;
      hexByteWidth = tempCtx.measureText('00 ').width;
      hexGroupGap = tempCtx.measureText('   ').width;
      offsetWidth = tempCtx.measureText('00000000:').width + 8;
      asciiWidth = tempCtx.measureText('| 0000000000000000 |   ').width;
      asciiGap = tempCtx.measureText('  ').width;
    }
    // 4. 计算canvas宽高
    const width = offsetWidth + hexByteWidth * 16 + hexGroupGap + asciiGap + asciiWidth;
    const height = lines.length * lineHeight + 10;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    // 5. 渲染
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    // 背景
    ctx.fillStyle = '#f3f4f6'; // 与HTML一致
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < lines.length; row++) {
      const globalRow = row + lineStart;
      const y = 8 + row * lineHeight + lineHeight / 2;
      // 斑马色（全局行号）
      if (globalRow % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 8 + row * lineHeight, width, lineHeight);
      }
      // 偏移区
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'start';
      const offset = globalRow.toString(16).padStart(8, '0') + ':';
      ctx.fillText(offset, 2, y);
      // HEX区
      let x = offsetWidth + 2;
      ctx.textAlign = 'start';
      for (let j = 0; j < lines[row].length; j++) {
        if (j > 0 && j % 8 === 0) x += hexGroupGap;
        ctx.fillStyle = '#23272e';
        ctx.fillText(lines[row][j].padStart(2, '0'), x, y);
        x += hexByteWidth;
      }
      // ASCII区
      let ascii = '';
      for (let j = 0; j < lines[row].length; j++) {
        const charCode = parseInt(lines[row][j], 16);
        const ch = (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        ascii += ch;
      }
      ascii = ascii.padEnd(16, ' ');
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'start';
      const asciiX = offsetWidth + hexByteWidth * 16 + hexGroupGap + asciiGap + 2;
      // 兼容 tempCtx 可能为 null
      ctx.fillText('| ' + ascii + ' |   ', asciiX, y);
    }
    ctx.restore();
    canvas._hexLines = lines;
    canvas._hexLineStart = lineStart;
  }
} 