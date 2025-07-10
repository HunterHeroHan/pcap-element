import { LanguageKey, LanguageConfig, Languages } from '../types/index';

/**
 * I18nManager 国际化管理器
 * 负责加载、管理和切换多语言配置。
 * 采用单例模式，确保全局唯一。
 */
export class I18nManager {
  // 单例实例
  private static instance: I18nManager;
  // 语言配置对象
  private languages: Languages | null = null;
  // 当前语言
  private currentLang: keyof Languages = 'zh-cn';
  // 语言加载Promise，防止重复加载
  private loadPromise: Promise<Languages> | null = null;

  // 私有构造函数，禁止外部实例化
  private constructor() {}

  /**
   * 获取I18nManager单例实例
   */
  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  /**
   * 加载所有语言配置（异步）
   * @returns 语言配置对象
   */
  async loadLanguages(): Promise<Languages> {
    if (this.languages) {
      return this.languages;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = this.fetchLanguages(); // 开始加载
    this.languages = await this.loadPromise;
    return this.languages;
  }

  // 实际从服务器获取语言配置
  private async fetchLanguages(): Promise<Languages> {
    try {
      const response = await fetch('/i18n/languages.json');
      if (!response.ok) {
        throw new Error(`Failed to load languages: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load language configuration:', error);
      // 加载失败时返回默认配置
      return this.getDefaultLanguages();
    }
  }

  // 默认语言配置（中英文）
  private getDefaultLanguages(): Languages {
    return {
      'zh-cn': {
        loading: '加载PCAP数据中...',
        errorNoSrc: '未提供src属性',
        errorLoadFailed: '加载PCAP文件失败',
        summary: 'PCAP摘要',
        totalPackets: '总数据包数',
        totalBytes: '总字节数',
        protocolTypes: '协议种类',
        protocolDistribution: '协议分布',
        topSources: '活跃源地址',
        topDestinations: '活跃目的地址',
        packetList: '数据包列表',
        packet: '数据包',
        sourceAddress: '源地址',
        destinationAddress: '目的地址',
        length: '长度',
        protocol: '协议',
        bytes: '字节'
      },
      'en-us': {
        loading: 'Loading PCAP data...',
        errorNoSrc: 'No src attribute provided',
        errorLoadFailed: 'Failed to load PCAP file',
        summary: 'PCAP Summary',
        totalPackets: 'Total Packets',
        totalBytes: 'Total Bytes',
        protocolTypes: 'Protocol Types',
        protocolDistribution: 'Protocol Distribution',
        topSources: 'Top Sources',
        topDestinations: 'Top Destinations',
        packetList: 'Packet List',
        packet: 'Packet',
        sourceAddress: 'Source',
        destinationAddress: 'Destination',
        length: 'Length',
        protocol: 'Protocol',
        bytes: 'bytes'
      }
    };
  }

  /**
   * 设置当前语言
   * @param lang 语言代码
   */
  setLanguage(lang: string) {
    this.currentLang = (lang === 'en-us' ? 'en-us' : 'zh-cn') as keyof Languages;
  }

  /**
   * 获取当前语言代码
   */
  getCurrentLanguage(): keyof Languages {
    return this.currentLang;
  }

  /**
   * 获取指定key的国际化文本
   * @param key 文本key
   */
  async getText(key: LanguageKey): Promise<string> {
    const languages = await this.loadLanguages();
    return languages[this.currentLang][key];
  }

  /**
   * 获取当前语言的全部文本
   */
  async getAllTexts(): Promise<LanguageConfig> {
    const languages = await this.loadLanguages();
    return languages[this.currentLang];
  }
} 