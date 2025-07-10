/**
 * FormatUtils 格式化工具类
 * 提供常用的格式化方法，如字节数、MAC地址、IP地址等。
 */
export class FormatUtils {
  /**
   * 格式化字节数为带单位的字符串
   * @param bytes 字节数
   * @returns 格式化后的字符串，如“1.2 MB”
   */
  static formatBytes(bytes: number): string {
    const UNITS = ['B', 'KB', 'MB', 'GB'];
    
    // 处理非法输入
    if (bytes < 0) {
      return `0.0 ${UNITS[0]}`;
    }
  
    let size = bytes;
    let unitIndex = 0;
  
    while (size >= 1024 && unitIndex < UNITS.length - 1) {
      size /= 1024;
      unitIndex++;
    }
  
    return `${size.toFixed(1)} ${UNITS[unitIndex]}`;
  }

  /**
   * 格式化MAC地址为标准字符串
   * @param bytes MAC地址字节数组（必须是6字节）
   * @returns 格式化后的MAC地址字符串
   */
  static formatMacAddress(bytes: Uint8Array): string {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('Input must be a Uint8Array');
    }
    if (bytes.length !== 6) {
      throw new Error('MAC address must be exactly 6 bytes long');
    }
  
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
  }

    /**
     * 格式化IP地址为点分十进制字符串
     * @param bytes IP地址字节数组 (IPv4: 4字节, IPv6: 16字节)
     * @returns 格式化后的IP地址字符串
     * @throws 如果输入无效会抛出错误
     */
    static formatIpAddress(bytes: Uint8Array): string {
      if (!(bytes instanceof Uint8Array)) {
        throw new TypeError('Input must be a Uint8Array');
      }
  
      if (bytes.length !== 4 && bytes.length !== 16) {
        throw new RangeError('IP address must be either 4 bytes (IPv4) or 16 bytes (IPv6)');
      }
  
      return Array.from(bytes).join('.');
    }

  /**
   * 将字节数组转换为十六进制字符串
   * @param data 字节数组
   * @returns 十六进制字符串
   */
  static arrayToHexString(data: Uint8Array): string {
    return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
  }

    /**
     * 读取32位无符号整数（小端序）
     * @param buffer 缓冲区
     * @param offset 偏移量
     * @returns 32位整数
     * @throws 如果 offset 超出合法范围
     */
    static readUint32(buffer: Uint8Array, offset: number): number {
      if (offset < 0 || offset + 3 >= buffer.length) {
        throw new RangeError('Offset is out of bounds.');
      }
  
      // 使用 DataView 明确表达小端序读取逻辑
      const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      return dataView.getUint32(offset, true); // true 表示小端序
    }
  }