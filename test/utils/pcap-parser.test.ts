import { PcapParser } from '../../src/utils/pcap-parser';
import { FormatUtils } from '../../src/utils/format-utils';

describe('PcapParser', () => {
  test('should throw error for invalid PCAP header', () => {
    const invalidBuffer = new ArrayBuffer(10);
    expect(() => PcapParser.parsePcapFile(invalidBuffer)).toThrow('PCAP文件无效：文件头过小');
  });

  test('should throw error for invalid magic number', () => {
    // 24字节头部，magic number填错
    const buf = new Uint8Array(24);
    buf[0] = 0x12; buf[1] = 0x34; buf[2] = 0x56; buf[3] = 0x78;
    expect(() => PcapParser.parsePcapFile(buf.buffer)).toThrow(/magic number/);
  });

  test('should accept valid BE/LE/NS magic numbers', () => {
    // 支持的magic number
    const magics = [0xa1b2c3d4, 0xd4c3b2a1, 0xa1b23c4d, 0x4d3cb2a1];
    for (const magic of magics) {
      const buf = new Uint8Array(24);
      new DataView(buf.buffer).setUint32(0, magic, false);
      expect(() => PcapParser.parsePcapFile(buf.buffer)).not.toThrow();
    }
  });

  test('should parse empty pcap (no packets)', () => {
    const buf = new Uint8Array(24);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets).toEqual([]);
    expect(result.summary.totalPackets).toBe(0);
    expect(result.summary.totalBytes).toBe(0);
    expect(result.fullHex).toBe(FormatUtils.arrayToHexString(buf));
  });

  test('should parse one minimal ARP packet', () => {
    // 构造：头部+1包（ARP）
    const buf = new Uint8Array(24 + 16 + 14);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false); // magic
    // packet header
    const offset = 24;
    new DataView(buf.buffer).setUint32(offset, 1, true); // ts
    new DataView(buf.buffer).setUint32(offset+4, 2, true); // us
    new DataView(buf.buffer).setUint32(offset+8, 14, true); // caplen
    // 以太网帧 ARP
    buf[24+16+12] = 0x08; buf[24+16+13] = 0x06; // EtherType=0x0806
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('ARP');
    expect(result.summary.protocols.ARP).toBe(1);
  });

  test('should skip VLAN packets', () => {
    // VLAN EtherType=0x8100
    const buf = new Uint8Array(24 + 16 + 14);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 14, true);
    buf[40+12] = 0x81; buf[40+13] = 0x00;
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(0);
    expect(result.summary.totalPackets).toBe(0);
  });

  test('should parse one minimal IPv4 TCP packet with flags', () => {
    // 构造：头部+1包（IPv4+TCP）
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 20);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 54, true); // 14+20+20
    // 以太网帧 EtherType=0x0800
    buf[40+12] = 0x08; buf[40+13] = 0x00;
    // IPv4 header
    buf[54] = 0x45; // version+ihl
    buf[63] = 6; // protocol=TCP
    // TCP header
    buf[74] = 0x00; buf[75] = 0x50; // src port 80
    buf[76] = 0x01; buf[77] = 0xbb; // dst port 443
    buf[87] = 0x12; // flags: SYN+ACK
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('TCP');
    expect(result.packets[0].flags).toContain('SYN');
    expect(result.packets[0].flags).toContain('ACK');
    expect(result.packets[0].port).toBe(80);
    expect(result.summary.protocols.TCP).toBe(1);
  });

  test('should parse one minimal IPv4 UDP packet', () => {
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 8);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 42, true); // 14+20+8
    buf[40+12] = 0x08; buf[40+13] = 0x00;
    buf[54] = 0x45;
    buf[63] = 17; // protocol=UDP
    buf[74] = 0x13; buf[75] = 0x88; // src port 5000
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('UDP');
    expect(result.packets[0].port).toBe(5000);
    expect(result.summary.protocols.UDP).toBe(1);
  });

  test('should parse one minimal IPv4 ICMP packet', () => {
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 8);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 42, true);
    buf[40+12] = 0x08; buf[40+13] = 0x00;
    buf[54] = 0x45;
    buf[63] = 1; // protocol=ICMP
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('ICMP');
    expect(result.summary.protocols.ICMP).toBe(1);
  });

  test('should parse one minimal IPv4 SMTP packet (TCP dst port 25)', () => {
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 20);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 54, true);
    buf[40+12] = 0x08; buf[40+13] = 0x00;
    buf[54] = 0x45;
    buf[63] = 6; // protocol=TCP
    buf[74] = 0x00; buf[75] = 0x19; // src port 25
    buf[76] = 0x00; buf[77] = 0x19; // dst port 25
    buf[87] = 0x10; // flags: ACK
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('SMTP');
    expect(result.packets[0].port).toBe(25);
    expect(result.packets[0].flags).toContain('ACK');
    expect(result.summary.protocols.SMTP).toBe(1);
  });

  test('should parse one minimal IPv6 packet as Unknown', () => {
    const buf = new Uint8Array(24 + 16 + 14 + 40);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 54, true);
    buf[40+12] = 0x86; buf[40+13] = 0xdd; // EtherType=0x86DD
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(1);
    expect(result.packets[0].protocol).toBe('IPv6');
    expect(result.summary.protocols.IPv6).toBe(1);
  });

  test('should handle malformed/short packets gracefully', () => {
    // caplen超大
    const buf = new Uint8Array(24 + 16);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 999999, true);
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(0);
  });

  test('should parse multiple packets and summary correctly', () => {
    // 两个包：一个ARP一个UDP
    const buf = new Uint8Array(24 + 2*(16+14+20+8));
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    // ARP
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 14, true);
    buf[40+12] = 0x08; buf[40+13] = 0x06;
    // UDP
    const off2 = 24+16+14;
    new DataView(buf.buffer).setUint32(off2, 3, true);
    new DataView(buf.buffer).setUint32(off2+4, 4, true);
    new DataView(buf.buffer).setUint32(off2+8, 42, true);
    buf[off2+16+12] = 0x08; buf[off2+16+13] = 0x00;
    buf[off2+16+14] = 0x45; // version+ihl
    buf[off2+16+14+9] = 17; // protocol=UDP
    buf[off2+16+14+20] = 0x13; buf[off2+16+14+21] = 0x88;
    const result = PcapParser.parsePcapFile(buf.buffer);
    expect(result.packets.length).toBe(2);
    expect(result.summary.totalPackets).toBe(2);
    expect(result.summary.protocols.ARP).toBe(1);
    expect(result.summary.protocols.UDP).toBe(1);
    expect(result.summary.totalBytes).toBe(result.packets[0].length + result.packets[1].length);
    expect(result.summary.topSources.length).toBeGreaterThan(0);
    expect(result.summary.topDestinations.length).toBeGreaterThan(0);
  });

  test('should parse TCP flags robustly', () => {
    // flags=0x3F（所有6位都置1）
    expect(PcapParser['parseTcpFlags'](0x3F)).toEqual(['FIN','SYN','RST','PSH','ACK','URG']);
    // flags=0x00
    expect(PcapParser['parseTcpFlags'](0x00)).toEqual([]);
    // 非法flags
    expect(PcapParser['parseTcpFlags'](null as unknown as number)).toEqual([]);
    expect(PcapParser['parseTcpFlags'](999999)).toEqual([]);
  });
}); 