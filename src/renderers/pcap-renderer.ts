import { PcapData, PcapPacket, LanguageConfig } from '../types/index';
import { I18nManager } from '../i18n/i18n-manager';
import { FormatUtils } from '../utils/format-utils';

/**
 * PcapRenderer 类
 * 负责将PCAP解析后的数据渲染为HTML结构，供页面展示。
 */
export class PcapRenderer {
  // 国际化管理器实例
  private i18nManager: I18nManager;

  constructor() {
    // 获取国际化单例
    this.i18nManager = I18nManager.getInstance();
  }

  /**
   * 转义 HTML 特殊字符，防止XSS
   * @param str 原始字符串
   * @returns 转义后的字符串
   */
  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (match) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;'
    }[match] || match));
  }

  /**
   * 渲染PCAP数据为HTML
   * @param data 解析后的PCAP数据
   * @param displayMode 显示模式：'parsed' | 'hex'
   * @returns HTML字符串
   */
  async renderPcapData(data: PcapData, displayMode: 'parsed' | 'hex' = 'parsed', useCanvas: boolean = true): Promise<string> {
    const texts = await this.i18nManager.getAllTexts(); // 获取所有国际化文本
    const summaryHtml = this.renderSummary(data, texts); // 渲染摘要信息
    if (displayMode === 'hex') {
      // 只渲染摘要+全文件16进制
      return summaryHtml + this.renderFullHex(data, texts, useCanvas);
    }
    const packetsHtml = this.renderPackets(data, texts, displayMode); // 渲染数据包列表
    return summaryHtml + packetsHtml; // 拼接返回
  }

  /**
   * 渲染摘要信息区域
   * @param data PCAP数据
   * @param texts 国际化文本
   */
  private renderSummary(data: PcapData, texts: LanguageConfig): string {
    // 工具函数：安全获取对象键数量
    const safeKeysLength = (obj: Record<string, unknown> | null | undefined): number => {
      return obj ? Object.keys(obj).length : 0;
    };

    // 工具函数：生成地址列表字符串
    const formatAddressList = (list: Array<{ address: string; count: number }> | null | undefined): string => {
      if (!list || list.length === 0) return '';
      return list.slice(0, 3).map(item => `${this.escapeHtml(item.address)} (${item.count})`).join(', ');
    };

    // 数据准备
    const totalPackets = data.summary.totalPackets ?? 0;
    const totalBytes = this.formatBytes(data.summary.totalBytes ?? 0);
    const protocolCount = safeKeysLength(data.summary.protocols);

    const protocolDistribution = Object.entries(data.summary.protocols ?? {})
      .map(([protocol, count]) => `${this.escapeHtml(protocol)}: ${count}`)
      .join(', ');

    const topSources = formatAddressList(data.summary.topSources);
    const topDestinations = formatAddressList(data.summary.topDestinations);

    return `
      <div class="summary">
        <h3>${this.escapeHtml(texts.summary)}</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">${this.escapeHtml(texts.totalPackets)}</div>
            <div class="value">${totalPackets}</div>
          </div>
          <div class="summary-item">
            <div class="label">${this.escapeHtml(texts.totalBytes)}</div>
            <div class="value">${totalBytes}</div>
          </div>
          <div class="summary-item">
            <div class="label">${this.escapeHtml(texts.protocolTypes)}</div>
            <div class="value">${protocolCount}</div>
          </div>
        </div>
        <div class="summary-details">
          <span class="detail-item"><strong>${this.escapeHtml(texts.protocolDistribution)}:</strong> ${protocolDistribution}</span>
          ${topSources ? `<span class="detail-item"><strong>${this.escapeHtml(texts.topSources)}:</strong> ${topSources}</span>` : ''}
          ${topDestinations ? `<span class="detail-item"><strong>${this.escapeHtml(texts.topDestinations)}:</strong> ${topDestinations}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 渲染数据包列表区域
   * @param data PCAP数据
   * @param texts 国际化文本
   * @param displayMode 显示模式
   */
  private renderPackets(data: PcapData, texts: Record<string, string>, displayMode: 'parsed' | 'hex' = 'parsed'): string {
    const packetLabel = texts.packet;
    if (!data.packets || data.packets.length === 0) {
      return `<div class="packets empty">${this.escapeHtml(texts.packetList)}: ${this.escapeHtml(texts.noPackets)}</div>`;
    }
    return `
      <div class="packets">
        <h3>${this.escapeHtml(texts.packetList)} (${data.packets.length})</h3>
        ${data.packets.map((packet: PcapPacket, index: number) => {
      const protocolLower = packet.protocol.toLowerCase();
      const timestamp = this.formatTimestamp(packet.timestamp);
      const isEven = index % 2 === 0;

      // 根据显示模式渲染数据包内容
      const packetContent = displayMode === 'hex'
        ? this.renderHexPacket(packet, texts)
        : this.renderParsedPacket(packet, texts);

      return `
            <div class="packet ${isEven ? 'even' : 'odd'}">
              <div class="packet-header">
                <div class="packet-title">
                  <span><strong>${packetLabel} ${index + 1}</strong></span>
                  <span class="protocol-badge ${protocolLower}">${packet.protocol}</span>
                </div>
                <span>${timestamp}</span>
              </div>
              ${packetContent}
              ${index < data.packets.length - 1 ? '<div class="packet-divider"></div>' : ''}
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  /**
   * 渲染解析模式的数据包
   */
  private renderParsedPacket(packet: PcapPacket, texts: Record<string, string>): string {
    // 基本信息
    let html = `
      <div class="packet-info">
        <div><strong>${texts.sourceAddress}:</strong> ${this.escapeHtml(packet.source)}</div>
        <div><strong>${texts.destinationAddress}:</strong> ${this.escapeHtml(packet.destination)}</div>
        <div><strong>${texts.length}:</strong> ${packet.length} ${texts.bytes}</div>
        <div><strong>${texts.protocol}:</strong> ${packet.protocol}</div>
        ${packet.port !== undefined ? `<div><strong>${texts.port}:</strong> ${packet.port}</div>` : ''}
        ${packet.flags && packet.flags.length ? `<div><strong>${texts.flags}:</strong> ${packet.flags.join(', ')}</div>` : ''}
      </div>
    `;
    // 底层字段分组展示（label国际化）
    const lowLevel: string[] = [];
    if (packet.srcMac) lowLevel.push(`<div><strong>${texts.srcMac}:</strong> ${packet.srcMac}</div>`);
    if (packet.dstMac) lowLevel.push(`<div><strong>${texts.dstMac}:</strong> ${packet.dstMac}</div>`);
    if (packet.etherType) lowLevel.push(`<div><strong>${texts.etherType}:</strong> ${packet.etherType}</div>`);
    if (packet.ipTtl !== undefined) lowLevel.push(`<div><strong>${texts.ipTtl}:</strong> ${packet.ipTtl}</div>`);
    if (packet.ipId !== undefined) lowLevel.push(`<div><strong>${texts.ipId}:</strong> ${packet.ipId}</div>`);
    if (packet.ipChecksum) lowLevel.push(`<div><strong>${texts.ipChecksum}:</strong> ${packet.ipChecksum}</div>`);
    if (packet.tcpSeq !== undefined) lowLevel.push(`<div><strong>${texts.tcpSeq}:</strong> ${packet.tcpSeq}</div>`);
    if (packet.tcpAck !== undefined) lowLevel.push(`<div><strong>${texts.tcpAck}:</strong> ${packet.tcpAck}</div>`);
    if (packet.tcpWin !== undefined) lowLevel.push(`<div><strong>${texts.tcpWin}:</strong> ${packet.tcpWin}</div>`);
    if (packet.tcpChecksum) lowLevel.push(`<div><strong>${texts.tcpChecksum}:</strong> ${packet.tcpChecksum}</div>`);
    if (packet.udpLen !== undefined) lowLevel.push(`<div><strong>${texts.udpLen}:</strong> ${packet.udpLen}</div>`);
    if (packet.udpChecksum) lowLevel.push(`<div><strong>${texts.udpChecksum}:</strong> ${packet.udpChecksum}</div>`);
    if (lowLevel.length) {
      html += `<div class="packet-info">${lowLevel.join('')}</div>`;
    }
    html += `<div class="packet-data">${this.escapeHtml(packet.data)}</div>`;
    return html;
  }

  /**
   * 渲染16进制模式的数据包
   */
  private renderHexPacket(packet: PcapPacket, texts: Record<string, string>): string {
    const hexData = this.formatHexData(packet.data);
    return `
      <div class="packet-info">
        <div><strong>${texts.length}:</strong> ${packet.length} ${texts.bytes}</div>
      </div>
      <div class="hex-data">
        <pre>${hexData}</pre>
      </div>
    `;
  }

  /**
   * 渲染整个文件的16进制内容
   * 当数据行数大于5000时，使用Canvas渲染，否则用HTML
   */
  private renderFullHex(data: PcapData, texts: Record<string, string>, useCanvas: boolean = true): string {
    if (!data.fullHex) return '';
    // 计算行数
    const bytes = data.fullHex.split(' ').filter((b: string) => b.trim());
    const lineCount = Math.ceil(bytes.length / 16);
    const MAX_CANVAS_HEIGHT = 32760;
    const lineHeight = 22;
    const maxLinesPerCanvas = Math.floor(MAX_CANVAS_HEIGHT / lineHeight); // 1487
    if (useCanvas && lineCount > 6000) {
      // 只保留前2500行和后2500行HTML，中间canvas
      const lines: string[][] = [];
      for (let i = 0; i < bytes.length; i += 16) {
        lines.push(bytes.slice(i, i + 16));
      }
      const htmlLinesTop = lines.slice(0, 2500);
      const htmlLinesBottom = lines.slice(-2500);
      const canvasLines = lines.slice(2500, -2500);
      // 前2500行HTML
      let html = `<pre>${this.formatHexLinesToHtml(htmlLinesTop, 0)}</pre>`;
      // 中间canvas分段
      let canvasIndex = 0;
      let canvasLineStart = 2500;
      for (let start = 0; start < canvasLines.length; start += maxLinesPerCanvas) {
        const chunk = canvasLines.slice(start, start + maxLinesPerCanvas);
        const canvasId = `hex-canvas-${Math.random().toString(36).slice(2)}-${canvasIndex}`;
        if (typeof window !== 'undefined') {
          window.__pcapHexCanvasData__ = window.__pcapHexCanvasData__ || {};
          window.__pcapHexCanvasData__[canvasId] = { lines: chunk, canvasWidth: 0, canvasHeight: 0, lineStart: canvasLineStart };
        }
        html += `<canvas id="${canvasId}"></canvas>`;
        canvasIndex++;
        canvasLineStart += chunk.length;
      }
      // 后2500行HTML
      html += `<pre>${this.formatHexLinesToHtml(htmlLinesBottom, lines.length - 2500)}</pre>`;
      return `
        <div class="packets">
          <h3>${this.escapeHtml(texts.hexViewTitle)}</h3>
          <div class="hex-data" style="overflow-x:auto;">
            ${html}
          </div>
        </div>
      `;
    } else if (useCanvas && lineCount > 5000) {
      // Canvas分段渲染
      const lines: string[][] = [];
      for (let i = 0; i < bytes.length; i += 16) {
        lines.push(bytes.slice(i, i + 16));
      }
      let html = '';
      let canvasIndex = 0;
      let canvasLineStart = 0;
      for (let start = 0; start < lines.length; start += maxLinesPerCanvas) {
        const chunk = lines.slice(start, start + maxLinesPerCanvas);
        const canvasId = `hex-canvas-${Math.random().toString(36).slice(2)}-${canvasIndex}`;
        if (typeof window !== 'undefined') {
          window.__pcapHexCanvasData__ = window.__pcapHexCanvasData__ || {};
          window.__pcapHexCanvasData__[canvasId] = { lines: chunk, canvasWidth: 0, canvasHeight: 0, lineStart: canvasLineStart };
        }
        html += `<canvas id="${canvasId}"></canvas>`;
        canvasIndex++;
        canvasLineStart += chunk.length;
      }
      return `
        <div class="packets">
          <h3>${this.escapeHtml(texts.hexViewTitle)}</h3>
          <div class="hex-data" style="overflow-x:auto;">
            ${html}
          </div>
        </div>
      `;
    } else {
      // HTML渲染
      const hexData = this.formatHexData(data.fullHex);
      return `
        <div class="packets">
          <h3>${this.escapeHtml(texts.hexViewTitle)}</h3>
          <div class="hex-data">
            <pre>${hexData}</pre>
          </div>
        </div>
      `;
    }
  }

  // 新增：将多行hex渲染为HTML，支持指定起始行号
  private formatHexLinesToHtml(lines: string[][], startLine: number): string {
    return lines.map((lineBytes, i) => {
      const offset = (i + startLine).toString(16).padStart(8, '0');
      let hexStr = '';
      for (let j = 0; j < lineBytes.length; j++) {
        if (j > 0 && j % 8 === 0) hexStr += '   ';
        hexStr += lineBytes[j].padStart(2, '0') + ' ';
      }
      hexStr += '   '.repeat(16 - lineBytes.length);
      let asciiStr = lineBytes.map(b => {
        const charCode = parseInt(b, 16);
        const ch = (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        return this.escapeHtml(ch);
      }).join('');
      if (lineBytes.length < 16) asciiStr += ' '.repeat(16 - lineBytes.length);
      return `<div class="hex-line"><span class="hex-offset">${offset}:</span><span class="hex-bytes">${hexStr}</span><span class="hex-ascii">| ${asciiStr} |</span></div>`;
    }).join('');
  }

  // 渲染单个canvas chunk
  private formatHexDataCanvasChunk(lines: string[][], canvasId: string): { html: string, canvasWidth: number, canvasHeight: number } {
    const fontSize = 10; // px
    const lineHeight = 22; // px
    const fontFamily = 'JetBrains Mono, Consolas, Monaco, Courier New, monospace';
    const offsetWidth = 60; // 偏移区宽度
    const hexByteWidth = 22; // 每字节宽度
    const hexGroupGap = 12; // 8字节分组间距
    const asciiGap = 24; // HEX区与ASCII区间距
    const asciiWidth = 16 * 10; // 16字节ASCII区宽度
    const canvasWidth = offsetWidth + 16 * hexByteWidth + hexGroupGap + asciiGap + asciiWidth + 30;
    const canvasHeight = lines.length * lineHeight + 10;
    const html = `<canvas id="${canvasId}" width="${canvasWidth}" height="${canvasHeight}" style="display:block;"></canvas>`;
    return { html, canvasWidth, canvasHeight };
  }

  /**
   * 格式化16进制数据，每行16字节，带偏移地址和分组高亮HTML结构（分组间用三个空格，ASCII区|与内容同在一个span，末行ascii宽度补齐）
   */
  private formatHexData(hexString: string): string {
    const bytes = hexString.split(' ').filter(b => b.trim());
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const lineBytes = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(8, '0');
      // HEX区每8字节分组，组间插入三个空格
      let hexStr = '';
      for (let j = 0; j < lineBytes.length; j++) {
        if (j > 0 && j % 8 === 0) {
          hexStr += '   ';
        }
        hexStr += lineBytes[j].padStart(2, '0') + ' ';
      }
      // 补齐16字节的显示
      hexStr += '   '.repeat(16 - lineBytes.length);
      // ASCII区，末行不足16字节时补空格
      let asciiStr = lineBytes.map(b => {
        const charCode = parseInt(b, 16);
        const ch = (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        return this.escapeHtml(ch);
      }).join('');
      if (lineBytes.length < 16) {
        asciiStr += ' '.repeat(16 - lineBytes.length);
      }
      // 组装一行
      lines.push(
        `<div class="hex-line">
          <span class="hex-offset">${offset}:</span>
          <span class="hex-bytes">${hexStr}</span>
          <span class="hex-ascii">| ${asciiStr} |</span>
        </div>`
      );
    }
    return lines.join('');
  }

  /**
   * 格式化字节数显示
   * @param bytes 字节数
   * @returns 格式化后的字符串
   */
  private formatBytes(bytes: number): string {
    return FormatUtils.formatBytes(bytes);
  }

  // 新增格式化时间戳方法
  private formatTimestamp(ts: number): string {
    const d = new Date(ts * 1000);
    const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }
} 