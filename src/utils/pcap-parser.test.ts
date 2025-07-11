import { PcapParser } from './pcap-parser';

describe('PcapParser', () => {
  test('should throw error for invalid PCAP header', async () => {
    const invalidBuffer = new ArrayBuffer(10);
    await expect(PcapParser.parsePcapFile(invalidBuffer)).rejects.toThrow('PCAP文件无效：文件头过小');
  });

  // 可补充更多针对 parseEthernetPacket、parseIpPacket 的单元测试
}); 