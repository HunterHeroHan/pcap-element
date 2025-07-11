import { PcapPacket, PcapData } from '../types/index';
import { FormatUtils } from './format-utils';

// TCP标志位常量与类型
const TCP_FLAG_NAMES = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG'] as const;
type TcpFlag = typeof TCP_FLAG_NAMES[number];

// 获取TopN工具函数
function getTopN(record: Record<string, number>, n: number) {
  return Object.entries(record)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([address, count]) => ({ address, count }));
}

/**
 * PcapParser 类
 * 负责解析PCAP文件的二进制内容，提取数据包信息并生成统计摘要。
 * 所有方法均为静态方法，便于直接调用。
 */
export class PcapParser {
  private static readonly PCAP_HEADER_SIZE = 24;
  private static readonly PACKET_HEADER_SIZE = 16;
  private static readonly ETHERNET_HEADER_SIZE = 14;
  private static readonly IP_HEADER_MIN_SIZE = 20;
  private static readonly TCP_HEADER_SIZE = 20;

  /**
   * 解析整个PCAP文件为结构化数据
   */
  static parsePcapFile(arrayBuffer: ArrayBuffer): PcapData {
    const buffer = new Uint8Array(arrayBuffer);
    if (buffer.length < this.PCAP_HEADER_SIZE) {
      throw new Error('PCAP文件无效：文件头过小');
    }
    this.validatePcapHeader(buffer);
    const packets: PcapPacket[] = [];
    let offset = this.PCAP_HEADER_SIZE;
    while (offset <= buffer.length - this.PACKET_HEADER_SIZE) {
      const packet = this.parsePacket(buffer, offset);
      if (!packet) break;
      packets.push(packet);
      const packetLength = packet.length;
      offset += this.PACKET_HEADER_SIZE + packetLength;
      if (packetLength === 0) break;
    }
    return generateSummary(packets);
  }

  /**
   * 校验PCAP文件头（支持大端/小端/纳秒格式）
   */
  private static validatePcapHeader(buffer: Uint8Array): void {
    const dv = new DataView(buffer.buffer, buffer.byteOffset, 4);
    const magic32BE = dv.getUint32(0, false);
    const magic32LE = dv.getUint32(0, true);
    const validMagics = [0xa1b2c3d4, 0xd4c3b2a1, 0xa1b23c4d, 0x4d3cb2a1];
    if (!validMagics.includes(magic32BE) && !validMagics.includes(magic32LE)) {
      throw new Error(`PCAP文件无效：magic number不正确（BE: ${magic32BE.toString(16)}, LE: ${magic32LE.toString(16)})`);
    }
  }

  /**
   * 解析单个数据包
   */
  private static parsePacket(buffer: Uint8Array, offset: number): PcapPacket | null {
    if (offset < 0 || offset > buffer.length) return null;
    const timestamp = FormatUtils.readUint32(buffer, offset);
    const microSeconds = FormatUtils.readUint32(buffer, offset + 4);
    const capturedLength = FormatUtils.readUint32(buffer, offset + 8);
    const headerEnd = offset + this.PACKET_HEADER_SIZE;
    if (
      capturedLength === 0 ||
      headerEnd > buffer.length ||
      capturedLength > buffer.length ||
      headerEnd + capturedLength > buffer.length ||
      headerEnd + capturedLength > Number.MAX_SAFE_INTEGER
    ) {
      return null;
    }
    const packetData = buffer.slice(headerEnd, headerEnd + capturedLength);
    return this.parseEthernetPacket(packetData, timestamp, microSeconds);
  }

  /**
   * 解析以太网帧，自动识别协议类型
   */
  private static parseEthernetPacket(data: Uint8Array, timestamp: number, microSeconds: number): PcapPacket | null {
    if (data.length < this.ETHERNET_HEADER_SIZE) return null;
    const safeMicroSeconds = Math.min(Math.max(microSeconds, 0), 999999);
    const sourceMac = FormatUtils.formatMacAddress(data.slice(6, 12));
    const destMac = FormatUtils.formatMacAddress(data.slice(0, 6));
    const etherType = (data[12] << 8) | data[13];
    let protocol = 'Unknown';
    let transportSource = destMac;
    let transportDestination = sourceMac;
    let port: number | undefined;
    let flags: TcpFlag[] = [];
    if (etherType === 0x8100 || etherType === 0x88a8) {
      return null; // VLAN暂不支持
    }
    if (etherType === 0x0800) {
      const ipHeaderStart = this.ETHERNET_HEADER_SIZE;
      if (data.length >= ipHeaderStart + this.IP_HEADER_MIN_SIZE) {
        const ipPacket = this.parseIpPacket(data.subarray(ipHeaderStart));
        if (ipPacket) {
          protocol = ipPacket.protocol;
          transportSource = ipPacket.source;
          transportDestination = ipPacket.destination;
          port = ipPacket.port;
          flags = ipPacket.flags ?? [];
        }
      }
    } else if (etherType === 0x0806) {
      protocol = 'ARP';
    } else if (etherType === 0x86DD) {
      protocol = 'IPv6';
    }
    return {
      timestamp: timestamp + safeMicroSeconds / 1000000,
      length: data.length,
      data: FormatUtils.arrayToHexString(data),
      source: transportSource,
      destination: transportDestination,
      protocol,
      port,
      flags
    };
  }

  /**
   * 解析IP包，识别TCP/UDP/ICMP/SMTP等协议
   */
  private static parseIpPacket(ipData: Uint8Array): {protocol: string, source: string, destination: string, port?: number, flags?: TcpFlag[]} | null {
    if (!ipData || ipData.length < 20) return null;
    const ipVersion = (ipData[0] >> 4) & 0x0F;
    if (ipVersion !== 4) return null;
    const ipProtocol = ipData[9];
    const source = FormatUtils.formatIpAddress(ipData.slice(12, 16));
    const destination = FormatUtils.formatIpAddress(ipData.slice(16, 20));
    let protocol = 'Unknown';
    let port: number | undefined;
    let flags: TcpFlag[] = [];
    switch (ipProtocol) {
      case 1:
        protocol = 'ICMP';
        break;
      case 6:
        protocol = 'TCP';
        const tcpStart = this.IP_HEADER_MIN_SIZE;
        const tcpMinLength = tcpStart + this.TCP_HEADER_SIZE;
        if (ipData.length >= tcpMinLength) {
          const tcpData = ipData.slice(tcpStart);
          const srcPort = (tcpData[0] << 8) | tcpData[1];
          const dstPort = (tcpData[2] << 8) | tcpData[3];
          port = srcPort;
          // 确保tcpData[13]存在且有效
          if (tcpData.length > 13) {
            flags = this.parseTcpFlags(tcpData[13]);
          }
          if (dstPort === 25) protocol = 'SMTP';
        }
        break;
      case 17:
        protocol = 'UDP';
        const udpStart = this.IP_HEADER_MIN_SIZE;
        const udpMinLength = udpStart + 8;
        if (ipData.length >= udpMinLength) {
          const udpData = ipData.slice(udpStart);
          port = (udpData[0] << 8) | udpData[1];
        }
        break;
      default:
        protocol = `IP(${ipProtocol})`;
    }
    return { protocol, source, destination, port, flags };
  }

  /**
   * 解析TCP标志位
   */
  private static parseTcpFlags(flags: number): TcpFlag[] {
    // 确保flags是有效的字节值（0-255）
    if (typeof flags !== 'number' || !Number.isFinite(flags)) {
      return [];
    }
    
    // 将flags限制在0-255范围内，然后只取低6位作为TCP标志位
    const validFlags = (flags & 0xFF) & 0x3F; // 0x3F = 0b111111，只取低6位
    
    const activeFlags: TcpFlag[] = [];
    for (let i = 0; i < TCP_FLAG_NAMES.length; i++) {
      if (validFlags & (1 << i)) {
        activeFlags.push(TCP_FLAG_NAMES[i]);
      }
    }
    return activeFlags;
  }
}

/**
 * 生成数据包统计摘要
 */
function generateSummary(packets: PcapPacket[]): PcapData {
  if (!packets.length) {
    return {
      packets,
      summary: {
        totalPackets: 0,
        totalBytes: 0,
        protocols: {},
        topSources: [],
        topDestinations: []
      }
    };
  }
  const protocols: Record<string, number> = {};
  const sources: Record<string, number> = {};
  const destinations: Record<string, number> = {};
  let totalBytes = 0;
  packets.forEach(packet => {
    const protocol = packet.protocol || 'Unknown';
    const source = packet.source || 'Unknown';
    const destination = packet.destination || 'Unknown';
    protocols[protocol] = (protocols[protocol] || 0) + 1;
    sources[source] = (sources[source] || 0) + 1;
    destinations[destination] = (destinations[destination] || 0) + 1;
    totalBytes += packet.length;
  });
  const topSources = getTopN(sources, 5);
  const topDestinations = getTopN(destinations, 5);
  return {
    packets,
    summary: {
      totalPackets: packets.length,
      totalBytes,
      protocols,
      topSources,
      topDestinations
    }
  };
} 