import { LanguageKey, LanguageConfig, Languages } from '../types/index';
import languages from './languages.json';

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
    // 从 JSON 文件加载语言配置
    this.languages = languages as Languages;
    return this.languages;
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