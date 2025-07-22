// ========== DOM/全局对象扩展类型 ==========
/**
 * 扩展 HTMLCanvasElement 以支持自定义属性
 */
declare global {
  interface HTMLCanvasElement {
    /** 存储当前canvas渲染的hex行数据 */
    _hexLines?: string[][];
    /** 存储当前canvas渲染的起始行号 */
    _hexLineStart?: number;
  }

  /**
   * 扩展 Window 以支持全局临时存储canvas数据
   */
  interface Window {
    /**
     * 存储每个canvas的渲染数据，key为canvasId
     * lines: hex行数据
     * canvasWidth/canvasHeight: 预留
     * lineStart: 起始行号
     */
    __pcapHexCanvasData__?: Record<string, { lines: string[][]; canvasWidth: number; canvasHeight: number; lineStart: number }>;
  }
}

/**
 * 单个数据包结构
 */
export interface PcapPacket {
  source: string;
  destination: string;
  protocol: string;
  length: number;
  port?: number;
  flags?: string[];
  data: string;
  srcMac?: string;
  dstMac?: string;
  etherType?: string;
  ipTtl?: number;
  ipId?: number;
  ipChecksum?: string;
  tcpSeq?: number;
  tcpAck?: number;
  tcpWin?: number;
  tcpChecksum?: string;
  udpLen?: number;
  udpChecksum?: string;
  timestamp: number;
}

/**
 * PCAP 文件解析后的数据结构
 */
export interface PcapData {
  packets: PcapPacket[];
  summary: {
    totalPackets: number;
    totalBytes: number;
    protocols: Record<string, number>;
    topSources: Array<{ address: string; count: number }>;
    topDestinations: Array<{ address: string; count: number }>;
  };
  fullHex: string;
}

/**
 * 国际化语言配置
 */
export interface LanguageConfig {
  [key: string]: string;
}

/**
 * 支持的国际化 key
 */
export type LanguageKey =
  | 'loading'
  | 'summary'
  | 'totalPackets'
  | 'totalBytes'
  | 'protocolTypes'
  | 'protocolDistribution'
  | 'topSources'
  | 'topDestinations'
  | 'packetList'
  | 'noPackets'
  | 'sourceAddress'
  | 'destinationAddress'
  | 'length'
  | 'bytes'
  | 'protocol'
  | 'port'
  | 'flags'
  | 'srcMac'
  | 'dstMac'
  | 'etherType'
  | 'ipTtl'
  | 'ipId'
  | 'ipChecksum'
  | 'tcpSeq'
  | 'tcpAck'
  | 'tcpWin'
  | 'tcpChecksum'
  | 'udpLen'
  | 'udpChecksum'
  | 'hexViewTitle'
  | 'showHex'
  | 'showParsed'
  | 'fullscreen'
  | 'exitFullscreen'
  | 'errorNoSrc'
  | 'errorLoadFailed'
  | 'buttonLoading';

/**
 * 多语言配置类型
 */
export interface Languages {
  [lang: string]: LanguageConfig;
}

export {}; 