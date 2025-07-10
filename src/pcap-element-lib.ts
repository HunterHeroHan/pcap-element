/**
 * 该文件为PCAP元素库的入口文件。
 * 主要导出Web组件及相关工具类，供外部使用。
 */
import './pcap-element'; // 引入自定义元素的实现文件
import './styles.css';

// 导出主要类和工具，便于外部引用和类型推断
export { PcapElement } from './pcap-element'; // 导出PCAP自定义元素
export { PcapParser } from './utils/pcap-parser'; // 导出PCAP解析器
export { I18nManager } from './i18n/i18n-manager'; // 导出国际化管理器
export { PcapRenderer } from './renderers/pcap-renderer'; // 导出渲染器
export { FormatUtils } from './utils/format-utils'; // 导出格式化工具
export * from './types/index'; // 导出所有类型定义 