import { PcapData } from '../types/index';
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
      "'": '&#39;'
    }[match] || match));
  }

  /**
   * 渲染PCAP数据为HTML
   * @param data 解析后的PCAP数据
   * @returns HTML字符串
   */
  async renderPcapData(data: PcapData): Promise<string> {
    const texts = await this.i18nManager.getAllTexts(); // 获取所有国际化文本
    const summaryHtml = this.renderSummary(data, texts); // 渲染摘要信息
    const packetsHtml = this.renderPackets(data, texts); // 渲染数据包列表
    return summaryHtml + packetsHtml; // 拼接返回
  }

  /**
   * 渲染摘要信息区域
   * @param data PCAP数据
   * @param texts 国际化文本
   */
  private renderSummary(data: PcapData, texts: Record<string, string>): string {
    // 工具函数：安全获取对象键数量
    const safeKeysLength = (obj: Record<string, any> | null | undefined): number => {
      return obj ? Object.keys(obj).length : 0;
    };
  
    // 工具函数：生成地址列表字符串
    const formatAddressList = (list: Array<{ address: string; count: number }> | null | undefined): string => {
      if (!list || list.length === 0) return '';
      return list.map(item => `${this.escapeHtml(item.address)} (${item.count})`).join(', ');
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
   */
  private renderPackets(data: PcapData, texts: Record<string, string>): string {
    const packetLabel = texts.packet;
    const bytesLabel = texts.bytes;
  
    return `
      <div class="packets">
        <h3>${this.escapeHtml(texts.packetList)} (${data.packets.length})</h3>
        ${data.packets.map((packet, index) => {
          const protocolLower = packet.protocol.toLowerCase();
          const escapedData = this.escapeHtml(packet.data);
          const timestamp = new Date(packet.timestamp * 1000).toISOString();
          const isEven = index % 2 === 0;
          return `
            <div class="packet ${isEven ? 'even' : 'odd'}">
              <div class="packet-header">
                <div class="packet-title">
                  <span><strong>${packetLabel} ${index + 1}</strong></span>
                  <span class="protocol-badge ${protocolLower}">${packet.protocol}</span>
                </div>
                <span>${timestamp}</span>
              </div>
              <div class="packet-info">
                <div><strong>${texts.sourceAddress}:</strong> ${this.escapeHtml(packet.source)}</div>
                <div><strong>${texts.destinationAddress}:</strong> ${this.escapeHtml(packet.destination)}</div>
                <div><strong>${texts.length}:</strong> ${packet.length} ${bytesLabel}</div>
                <div><strong>${texts.protocol}:</strong> ${packet.protocol}</div>
              </div>
              <div class="packet-data">${escapedData}</div>
              ${index < data.packets.length - 1 ? '<div class="packet-divider"></div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * 格式化字节数显示
   * @param bytes 字节数
   * @returns 格式化后的字符串
   */
  private formatBytes(bytes: number): string {
    return FormatUtils.formatBytes(bytes);
  }
} 