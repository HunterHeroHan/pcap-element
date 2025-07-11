const fs = require('fs');
const path = require('path');

// 模拟 pcap-element 的 PcapParser
class PcapParser {
    static PCAP_HEADER_SIZE = 24;
    static PACKET_HEADER_SIZE = 16;
    static ETHERNET_HEADER_SIZE = 14;
    static IP_HEADER_MIN_SIZE = 20;
    static TCP_HEADER_SIZE = 20;

    static parsePcapFile(arrayBuffer) {
        const buffer = new Uint8Array(arrayBuffer);
        if (buffer.length < this.PCAP_HEADER_SIZE) {
            throw new Error('PCAP文件无效：文件头过小');
        }
        this.validatePcapHeader(buffer);
        const packets = [];
        let offset = this.PCAP_HEADER_SIZE;
        while (offset <= buffer.length - this.PACKET_HEADER_SIZE) {
            const packet = this.parsePacket(buffer, offset);
            if (!packet)
                break;
            packets.push(packet);
            const packetLength = packet.length;
            offset += this.PACKET_HEADER_SIZE + packetLength;
            if (packetLength === 0)
                break;
        }
        return this.generateSummary(packets);
    }

    static validatePcapHeader(buffer) {
        const dv = new DataView(buffer.buffer, buffer.byteOffset, 4);
        const magic32BE = dv.getUint32(0, false);
        const magic32LE = dv.getUint32(0, true);
        const validMagics = [0xa1b2c3d4, 0xd4c3b2a1, 0xa1b23c4d, 0x4d3cb2a1];
        if (!validMagics.includes(magic32BE) && !validMagics.includes(magic32LE)) {
            throw new Error(`PCAP文件无效：magic number不正确（BE: ${magic32BE.toString(16)}, LE: ${magic32LE.toString(16)})`);
        }
    }

    static parsePacket(buffer, offset) {
        if (offset < 0 || offset > buffer.length)
            return null;
        const timestamp = this.readUint32(buffer, offset);
        const microSeconds = this.readUint32(buffer, offset + 4);
        const capturedLength = this.readUint32(buffer, offset + 8);
        const headerEnd = offset + this.PACKET_HEADER_SIZE;
        if (capturedLength === 0 ||
            headerEnd > buffer.length ||
            capturedLength > buffer.length ||
            headerEnd + capturedLength > buffer.length ||
            headerEnd + capturedLength > Number.MAX_SAFE_INTEGER) {
            return null;
        }
        const packetData = buffer.slice(headerEnd, headerEnd + capturedLength);
        return this.parseEthernetPacket(packetData, timestamp, microSeconds);
    }

    static parseEthernetPacket(data, timestamp, microSeconds) {
        if (data.length < this.ETHERNET_HEADER_SIZE)
            return null;
        const safeMicroSeconds = Math.min(Math.max(microSeconds, 0), 999999);
        const sourceMac = this.formatMacAddress(data.slice(6, 12));
        const destMac = this.formatMacAddress(data.slice(0, 6));
        const etherType = (data[12] << 8) | data[13];
        let protocol = 'Unknown';
        let transportSource = destMac;
        let transportDestination = sourceMac;
        let port;
        let flags = [];
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
        }
        else if (etherType === 0x0806) {
            protocol = 'ARP';
        }
        else if (etherType === 0x86DD) {
            protocol = 'IPv6';
        }
        return {
            timestamp: timestamp + safeMicroSeconds / 1000000,
            length: data.length,
            data: this.arrayToHexString(data),
            source: transportSource,
            destination: transportDestination,
            protocol,
            port,
            flags
        };
    }

    static parseIpPacket(ipData) {
        if (!ipData || ipData.length < 20)
            return null;
        const ipVersion = (ipData[0] >> 4) & 0x0F;
        if (ipVersion !== 4)
            return null;
        const ipProtocol = ipData[9];
        const source = this.formatIpAddress(ipData.slice(12, 16));
        const destination = this.formatIpAddress(ipData.slice(16, 20));
        let protocol = 'Unknown';
        let port;
        let flags = [];
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
                    flags = this.parseTcpFlags(tcpData[13]);
                    if (dstPort === 25)
                        protocol = 'SMTP';
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

    static parseTcpFlags(flags) {
        console.log(`解析TCP标志位: ${flags} (0x${flags.toString(16).toUpperCase()})`);
        if (!Number.isInteger(flags) || flags < 0 || flags > 0b111111) {
            throw new Error('无效的TCP标志位值，必须是0~63之间的整数');
        }
        const TCP_FLAG_NAMES = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG'];
        const activeFlags = [];
        for (let i = 0; i < TCP_FLAG_NAMES.length; i++) {
            if (flags & (1 << i)) {
                activeFlags.push(TCP_FLAG_NAMES[i]);
            }
        }
        return activeFlags;
    }

    // 辅助方法
    static readUint32(buffer, offset) {
        return new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getUint32(0, false);
    }

    static formatMacAddress(data) {
        return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
    }

    static formatIpAddress(data) {
        return Array.from(data).join('.');
    }

    static arrayToHexString(data) {
        return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
    }

    static generateSummary(packets) {
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
        const protocols = {};
        const sources = {};
        const destinations = {};
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
        return {
            packets,
            summary: {
                totalPackets: packets.length,
                totalBytes,
                protocols,
                topSources: Object.entries(sources).sort(([,a], [,b]) => b - a).slice(0, 5),
                topDestinations: Object.entries(destinations).sort(([,a], [,b]) => b - a).slice(0, 5)
            }
        };
    }
}

// 主函数
function main() {
    const filePath = path.join(__dirname, 'sample-data', 'frag_http_req.pcap');
    
    if (!fs.existsSync(filePath)) {
        console.error(`文件不存在: ${filePath}`);
        return;
    }
    
    try {
        console.log(`测试解析文件: ${filePath}`);
        const buffer = fs.readFileSync(filePath);
        const result = PcapParser.parsePcapFile(buffer);
        console.log('✅ 解析成功!');
        console.log(`数据包数量: ${result.packets.length}`);
        console.log(`总字节数: ${result.summary.totalBytes}`);
        console.log('协议统计:', result.summary.protocols);
    } catch (error) {
        console.error('❌ 解析失败:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

main(); 