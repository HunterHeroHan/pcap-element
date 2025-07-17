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

  test('should parse and expose low-level fields (MAC, EtherType, IP, TCP, UDP)', () => {
    // 构造一个包含以太网、IP、TCP头的最小包
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 20);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 54, true); // 14+20+20
    // 以太网头
    buf.set([0xaa,0xbb,0xcc,0xdd,0xee,0xff], 40); // dstMac
    buf.set([0x11,0x22,0x33,0x44,0x55,0x66], 46); // srcMac
    buf[52] = 0x08; buf[53] = 0x00; // EtherType=0x0800
    // IP头
    buf[54] = 0x45; // version+ihl
    buf[55] = 0x00; // TOS
    buf[56] = 0x00; buf[57] = 0x28; // total length
    buf[58] = 0x12; buf[59] = 0x34; // ID
    buf[60] = 0x00; buf[61] = 0x00; // flags+frag offset
    buf[62] = 0x40; // TTL=64
    buf[63] = 6; // protocol=TCP
    buf[64] = 0xde; buf[65] = 0xad; // header checksum
    buf[66] = 192; buf[67] = 168; buf[68] = 1; buf[69] = 1; // src IP
    buf[70] = 192; buf[71] = 168; buf[72] = 1; buf[73] = 2; // dst IP
    // TCP头
    buf[74] = 0x00; buf[75] = 0x50; // src port 80
    buf[76] = 0x01; buf[77] = 0xbb; // dst port 443
    buf[78] = 0x12; buf[79] = 0x34; buf[80] = 0x56; buf[81] = 0x78; // seq
    buf[82] = 0x9a; buf[83] = 0xbc; buf[84] = 0xde; buf[85] = 0xf0; // ack
    buf[86] = 0x50; // data offset+flags
    buf[87] = 0x18; // flags
    buf[88] = 0x01; buf[89] = 0x00; // win
    buf[90] = 0xbe; buf[91] = 0xef; // checksum
    buf[92] = 0x00; buf[93] = 0x00; // urg ptr
    const result = PcapParser.parsePcapFile(buf.buffer);
    const pkt = result.packets[0];
    expect(pkt.srcMac).toBe('11:22:33:44:55:66'.toUpperCase());
    expect(pkt.dstMac).toBe('AA:BB:CC:DD:EE:FF');
    expect(pkt.etherType).toBe('0x0800');
    expect(pkt.ipTtl).toBe(64);
    expect(pkt.ipId).toBe(0x1234);
    expect(pkt.ipChecksum).toBe('0xdead');
    expect(pkt.tcpSeq).toBe(0x12345678);
    expect(pkt.tcpAck).toBe(0x9abcdef0);
    expect(pkt.tcpWin).toBe(256);
    expect(pkt.tcpChecksum).toBe('0xbeef');
  });

  test('should parse and expose UDP low-level fields', () => {
    // 构造一个包含以太网、IP、UDP头的最小包
    const buf = new Uint8Array(24 + 16 + 14 + 20 + 8);
    new DataView(buf.buffer).setUint32(0, 0xa1b2c3d4, false);
    new DataView(buf.buffer).setUint32(24, 1, true);
    new DataView(buf.buffer).setUint32(28, 2, true);
    new DataView(buf.buffer).setUint32(32, 42, true); // 14+20+8
    // 以太网头
    buf.set([0xaa,0xbb,0xcc,0xdd,0xee,0xff], 40); // dstMac
    buf.set([0x11,0x22,0x33,0x44,0x55,0x66], 46); // srcMac
    buf[52] = 0x08; buf[53] = 0x00; // EtherType=0x0800
    // IP头
    buf[54] = 0x45; // version+ihl
    buf[63] = 17; // protocol=UDP
    // UDP头
    buf[74] = 0x13; buf[75] = 0x88; // src port 5000
    buf[76] = 0x27; buf[77] = 0x10; // dst port 10000
    buf[78] = 0x00; buf[79] = 0x08; // len=8
    buf[80] = 0xbe; buf[81] = 0xef; // checksum
    const result = PcapParser.parsePcapFile(buf.buffer);
    const pkt = result.packets[0];
    expect(pkt.srcMac).toBe('11:22:33:44:55:66'.toUpperCase());
    expect(pkt.dstMac).toBe('AA:BB:CC:DD:EE:FF');
    expect(pkt.etherType).toBe('0x0800');
    expect(pkt.udpLen).toBe(8);
    expect(pkt.udpChecksum).toBe('0xbeef');
  });
}); 