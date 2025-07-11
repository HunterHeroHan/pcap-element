const fs = require('fs');
const path = require('path');

// TCP标志位常量
const TCP_FLAG_NAMES = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG'];

function analyzePcapFile(filePath) {
    console.log(`分析文件: ${filePath}`);
    
    try {
        const buffer = fs.readFileSync(filePath);
        const data = new Uint8Array(buffer);
        
        if (data.length < 24) {
            console.error('文件太小，无法读取PCAP头部');
            return;
        }
        
        // 分析PCAP头部
        const magic32BE = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0, false);
        const magic32LE = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0, true);
        const linktype = new DataView(buffer.buffer, buffer.byteOffset + 20, 4).getUint32(0, false);
        
        console.log(`PCAP Magic Number (BE): 0x${magic32BE.toString(16).toUpperCase()}`);
        console.log(`PCAP Magic Number (LE): 0x${magic32LE.toString(16).toUpperCase()}`);
        console.log(`链路层类型: 0x${linktype.toString(16).toUpperCase()}`);
        console.log(`文件大小: ${data.length} 字节\n`);
        
        // 解析数据包
        const packets = [];
        let offset = 24; // PCAP header size
        let packetCount = 0;
        
        while (offset < data.length - 16) { // 16 = packet header size
            packetCount++;
            const packetHeader = data.slice(offset, offset + 16);
            const capturedLength = new DataView(packetHeader.buffer, packetHeader.byteOffset + 8, 4).getUint32(0, false);
            
            if (capturedLength === 0) break;
            
            const packetData = data.slice(offset + 16, offset + 16 + capturedLength);
            const packetInfo = analyzePacketData(packetData, offset, packetCount);
            
            if (packetInfo) {
                packets.push(packetInfo);
            }
            
            offset += 16 + capturedLength;
        }
        
        console.log(`总数据包数: ${packetCount}`);
        console.log(`解析成功的数据包数: ${packets.length}\n`);
        
        // 分析TCP包
        const tcpPackets = packets.filter(p => p.protocol === 'TCP');
        console.log(`TCP数据包数: ${tcpPackets.length}\n`);
        
        tcpPackets.forEach((packet, index) => {
            const isValid = packet.tcpFlags >= 0 && packet.tcpFlags <= 63;
            const status = isValid ? '✅ 有效' : '❌ 无效 (超出0~63范围)';
            
            console.log(`=== TCP数据包 ${index + 1} ===`);
            console.log(`数据包编号: ${packet.packetNumber}`);
            console.log(`TCP标志位值: ${packet.tcpFlags} (0x${packet.tcpFlags.toString(16).toUpperCase()})`);
            console.log(`标志位二进制: ${packet.tcpFlags.toString(2).padStart(8, '0')}`);
            console.log(`状态: ${status}`);
            console.log(`源端口: ${packet.srcPort}`);
            console.log(`目标端口: ${packet.dstPort}`);
            console.log(`数据包偏移: ${packet.offset}`);
            console.log(`数据包长度: ${packet.length}`);
            
            if (!isValid) {
                console.log(`⚠️  问题: TCP标志位值 ${packet.tcpFlags} 超出有效范围 (0-63)`);
                console.log(`   这可能是导致pcap-element解析失败的原因`);
            }
            
            console.log('');
        });
        
        // 检查是否有无效的TCP标志位
        const invalidTcpPackets = tcpPackets.filter(p => p.tcpFlags < 0 || p.tcpFlags > 63);
        if (invalidTcpPackets.length > 0) {
            console.log(`⚠️  发现 ${invalidTcpPackets.length} 个TCP数据包具有无效的标志位值`);
            console.log('这些数据包会导致pcap-element解析失败');
        } else {
            console.log('✅ 所有TCP数据包的标志位值都在有效范围内');
        }
        
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

function analyzePacketData(data, packetOffset, packetNumber) {
    if (data.length < 14) return null; // Ethernet header minimum
    
    const etherType = (data[12] << 8) | data[13];
    
    if (etherType === 0x0800) { // IPv4
        if (data.length < 34) return null; // Ethernet + IP + TCP minimum
        
        const ipProtocol = data[23];
        if (ipProtocol === 6) { // TCP
            const tcpStart = 34; // Ethernet(14) + IP(20)
            if (data.length < tcpStart + 20) return null; // TCP header minimum
            
            const tcpData = data.slice(tcpStart, tcpStart + 20);
            const srcPort = (tcpData[0] << 8) | tcpData[1];
            const dstPort = (tcpData[2] << 8) | tcpData[3];
            const tcpFlags = tcpData[13]; // TCP flags byte
            
            return {
                protocol: 'TCP',
                srcPort,
                dstPort,
                tcpFlags,
                offset: packetOffset,
                length: data.length,
                packetNumber
            };
        } else if (ipProtocol === 17) { // UDP
            return {
                protocol: 'UDP',
                offset: packetOffset,
                length: data.length,
                packetNumber
            };
        } else if (ipProtocol === 1) { // ICMP
            return {
                protocol: 'ICMP',
                offset: packetOffset,
                length: data.length,
                packetNumber
            };
        } else {
            return {
                protocol: `IP(${ipProtocol})`,
                offset: packetOffset,
                length: data.length,
                packetNumber
            };
        }
    } else if (etherType === 0x0806) { // ARP
        return {
            protocol: 'ARP',
            offset: packetOffset,
            length: data.length,
            packetNumber
        };
    } else if (etherType === 0x86DD) { // IPv6
        return {
            protocol: 'IPv6',
            offset: packetOffset,
            length: data.length,
            packetNumber
        };
    }
    
    return {
        protocol: `Unknown(0x${etherType.toString(16)})`,
        offset: packetOffset,
        length: data.length,
        packetNumber
    };
}

// 主函数
function main() {
    const filePath = path.join(__dirname, 'sample-data', 'frag_http_req.pcap');
    
    if (!fs.existsSync(filePath)) {
        console.error(`文件不存在: ${filePath}`);
        return;
    }
    
    analyzePcapFile(filePath);
}

main(); 