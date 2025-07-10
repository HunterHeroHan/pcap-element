import { PcapParser } from './utils/pcap-parser';
import { I18nManager } from './i18n/i18n-manager';
import { PcapData, LanguageKey } from './types/index';
import { PcapRenderer } from './renderers/pcap-renderer';

/**
 * PcapElement 自定义元素
 * 用于在Web页面中以组件方式展示PCAP文件内容。
 */
export class PcapElement extends HTMLElement {
  // Shadow DOM根节点
  private shadow: ShadowRoot;
  // 加载中提示元素
  private loadingElement: HTMLElement;
  // 内容展示元素
  private contentElement: HTMLElement;
  // 错误信息展示元素
  private errorElement: HTMLElement;
  // 国际化管理器实例
  private i18nManager: I18nManager;
  // PCAP渲染器实例
  private renderer: PcapRenderer;

  constructor() {
    super();
    // 创建Shadow DOM
    this.shadow = this.attachShadow({ mode: 'open' });
    // 初始化各个DOM元素
    this.loadingElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.errorElement = document.createElement('div');
    // 获取国际化单例
    this.i18nManager = I18nManager.getInstance();
    // 创建渲染器
    this.renderer = new PcapRenderer();
    // 设置样式
    this.setupStyles();
    // 初始化元素内容
    this.setupElements().catch(console.error);
  }

  // 监听的属性列表，src为数据源，lang为语言
  static get observedAttributes() {
    return ['src', 'lang'];
  }

  // 元素插入DOM时回调
  async connectedCallback() {
    this.updateLanguage(); // 设置当前语言
    await this.loadPcapData(); // 加载PCAP数据
  }

  // 属性变化时回调
  async attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'src' && oldValue !== newValue) {
      await this.loadPcapData(); // 数据源变更时重新加载
    } else if (name === 'lang' && oldValue !== newValue) {
      this.updateLanguage(); // 语言变更时切换语言
      await this.loadPcapData(); // 重新渲染以更新语言
    }
  }

  // 根据lang属性设置当前语言
  private updateLanguage() {
    const lang = this.getAttribute('lang') || 'zh-cn';
    this.i18nManager.setLanguage(lang);
  }

  // 获取国际化文本
  private async getText(key: LanguageKey): Promise<string> {
    return await this.i18nManager.getText(key);
  }

  // 加载外部CSS样式
  private setupStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles.css';
    this.shadow.appendChild(link);
  }

  // 初始化各个DOM元素内容
  private async setupElements() {
    this.loadingElement.className = 'loading';
    this.loadingElement.textContent = await this.getText('loading');
    this.errorElement.className = 'error';
    this.errorElement.style.display = 'none';
    this.contentElement.className = 'content';
    this.shadow.appendChild(this.loadingElement);
    this.shadow.appendChild(this.errorElement);
    this.shadow.appendChild(this.contentElement);
  }

  // 加载PCAP数据并渲染
  private async loadPcapData() {
    const src = this.getAttribute('src');
    if (!src) {
      const errorText = await this.getText('errorNoSrc');
      this.showError(errorText);
      return;
    }
  
    const controller = new AbortController();
    const { signal } = controller;
  
    try {
      await this.showLoading();
  
      // 设置超时控制器
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
  
      const response = await fetch(src, { signal });
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
  
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty file received');
      }
  
      const pcapData = await PcapParser.parsePcapFile(arrayBuffer);
      await this.renderPcapData(pcapData);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.loadingElement.style.display = 'none'; // 确保 loading 状态被清除
    }
  }
  
  // 错误处理统一入口
  private async handleError(error: unknown) {
    let errorMessage = await this.getText('errorLoadFailed');
  
    // 避免暴露原始错误信息
    console.error('Load PCAP failed:', error); // 记录详细日志
    this.showError(errorMessage);
  }

  /**
   * 显示加载中状态
   * 注意：此方法不会改变任何功能或字符串内容，仅增强健壮性和用户体验
   */
  private async showLoading() {
    const { loadingElement, errorElement, contentElement } = this;
  
    // 防止 DOM 元素未定义导致的错误
    if (!loadingElement || !errorElement || !contentElement) {
      console.warn('缺少必要的 DOM 元素，无法正常显示加载状态');
      return;
    }
  
    try {
      const loadingText = await this.getText('loading');
  
      // 统一更新 DOM，减少重排次数（性能优化）
      loadingElement.style.display = 'block';
      loadingElement.textContent = loadingText;
  
      errorElement.style.display = 'none';
      contentElement.style.display = 'none';
    } catch (error) {
      console.error('加载 loading 文本时发生错误:', error);
      // 可选：提供默认文本提示
      // loadingElement.textContent = '加载中...';
    }
  }

  // 显示错误信息
  private showError(message: string) {
    // 防御性判断：确保元素存在
    if (!this.loadingElement || !this.errorElement || !this.contentElement) {
      console.warn('缺少必要的 DOM 元素，无法显示错误信息');
      return;
    }
  
    // 统一设置元素显示状态
    this._setDisplayState(this.loadingElement, 'none');
    this._setDisplayState(this.errorElement, 'block');
    this._setDisplayState(this.contentElement, 'none');
  
    // 设置错误信息
    this.errorElement.textContent = message;
  }
  
  // 封装 display 设置逻辑，便于复用和扩展
  private _setDisplayState(element: HTMLElement, displayValue: string) {
    element.style.display = displayValue;
  }

  // 渲染PCAP数据到内容区
  private async renderPcapData(data: PcapData) {
    this.loadingElement.style.display = 'none';
    this.errorElement.style.display = 'none';
    this.contentElement.style.display = 'block';
  
    try {
      const html = await this.renderer.renderPcapData(data);
      // 防止XSS：若html非可信内容，应进行转义后再插入
      this.contentElement.innerHTML = html;
    } catch (error) {
      console.error('渲染PCAP数据失败:', error);
      this.contentElement.style.display = 'none';
      this.errorElement.style.display = 'block';
      this.errorElement.textContent = '加载数据时发生错误，请重试。';
    }
  }
}

// 注册自定义元素，标签名为pcap-element
customElements.define('pcap-element', PcapElement); 