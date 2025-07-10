import { FormatUtils } from './format-utils';

describe('FormatUtils', () => {
  test('formatBytes should format bytes correctly', () => {
    expect(FormatUtils.formatBytes(1023)).toBe('1023.0 B');
    expect(FormatUtils.formatBytes(1024)).toBe('1.0 KB');
    expect(FormatUtils.formatBytes(1048576)).toBe('1.0 MB');
  });

  test('formatMacAddress should format MAC address', () => {
    expect(FormatUtils.formatMacAddress(new Uint8Array([0, 1, 2, 3, 4, 5]))).toBe('00:01:02:03:04:05');
  });

  test('formatIpAddress should format IP address', () => {
    expect(FormatUtils.formatIpAddress(new Uint8Array([192, 168, 1, 1]))).toBe('192.168.1.1');
  });

  test('arrayToHexString should convert array to hex string', () => {
    expect(FormatUtils.arrayToHexString(new Uint8Array([0, 255, 16]))).toBe('00 ff 10');
  });

  test('readUint32 should read little-endian uint32', () => {
    const arr = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
    expect(FormatUtils.readUint32(arr, 0)).toBe(0x12345678);
  });
}); 