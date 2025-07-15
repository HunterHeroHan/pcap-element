// PCAP解析相关类型定义
/**
 * 单个PCAP数据包结构
 */
export interface PcapPacket {
  timestamp: number; // 时间戳（秒）
  length: number; // 数据包长度（字节）
  data: string; // 原始数据（十六进制字符串）
  source: string; // 源地址（IP或MAC）
  destination: string; // 目的地址（IP或MAC）
  protocol: string; // 协议类型（如TCP/UDP/ICMP等）
  port?: number; // 端口号（可选）
  flags?: string[]; // TCP标志位（可选）
}

/**
 * PCAP文件整体结构
 */
export interface PcapData {
  packets: PcapPacket[]; // 所有数据包数组
  summary: {
    totalPackets: number; // 总包数
    totalBytes: number; // 总字节数
    protocols: Record<string, number>; // 协议分布统计
    topSources: Array<{address: string, count: number}>; // 活跃源地址
    topDestinations: Array<{address: string, count: number}>; // 活跃目的地址
  };
  fullHex?: string; // 整个文件的十六进制字符串
}

// 国际化相关类型定义
/**
 * 国际化文本key类型
 */
export type LanguageKey = string;

/**
 * 单种语言的文本配置
 */
export type LanguageConfig = Record<LanguageKey, string>;

/**
 * 所有支持的语言配置
 */
export type Languages = {
  'zh-cn': LanguageConfig;
  'en-us': LanguageConfig;
}; 