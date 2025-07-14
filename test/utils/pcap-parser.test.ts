import { PcapParser } from '../../src/utils/pcap-parser';

describe('PcapParser', () => {
  test('should throw error for invalid PCAP header', () => {
    const invalidBuffer = new ArrayBuffer(10);
    expect(() => PcapParser.parsePcapFile(invalidBuffer)).toThrow('PCAP文件无效：文件头过小');
  });

  // 可补充更多针对 parseEthernetPacket、parseIpPacket 的单元测试
}); 