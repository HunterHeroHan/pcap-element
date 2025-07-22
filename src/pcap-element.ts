import { PcapParser } from './utils/pcap-parser';
import { I18nManager } from './i18n/i18n-manager';
import { PcapData, LanguageKey } from './types/index';
import { PcapRenderer } from './renderers/pcap-renderer';
import { HexCanvasRenderer } from './renderers/hex-canvas-renderer';

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
  // 格式切换按钮元素
  private toggleButton: HTMLButtonElement;
  // 国际化管理器实例
  private i18nManager: I18nManager;
  // PCAP渲染器实例
  private renderer: PcapRenderer;
  // 当前显示模式：'parsed' | 'hex'
  private displayMode: 'parsed' | 'hex' = 'parsed';
  // 缓存的PCAP数据
  private cachedPcapData: PcapData | null = null;
  // 是否已注入样式
  private stylesInjected: boolean = false;
  private fullscreen: boolean = false;
  private showFullscreenBtn: boolean = false;
  private fullscreenButton?: HTMLButtonElement;
  private _resizeHandler: (() => void) | null = null;

  constructor() {
    super();
    // 创建Shadow DOM
    this.shadow = this.attachShadow({ mode: 'open' });
    // 初始化各个DOM元素
    this.loadingElement = document.createElement('div');
    this.contentElement = document.createElement('div');
    this.errorElement = document.createElement('div');
    this.toggleButton = document.createElement('button');
    // 获取国际化单例
    this.i18nManager = I18nManager.getInstance();
    // 创建渲染器
    this.renderer = new PcapRenderer();
    // 设置样式
    this.setupStyles();
    // 初始化元素内容
    this.setupElements().catch(console.error);
  }

  // 监听的属性列表，src为数据源，lang为语言，show-hex为是否显示16进制
  static get observedAttributes() {
    return ['src', 'lang', 'enableHexToggle', 'showfullscreenbtn', 'useCanvas'];
  }

  private get useCanvas(): boolean {
    const attr = this.getAttribute('useCanvas');
    return attr === 'true'; // 默认关闭
  }

  get showFullscreen() {
    return this.fullscreen;
  }
  set showFullscreen(val: boolean) {
    this.fullscreen = val;
    this.updateFullscreenState();
    this.updateFullscreenButton();
  }
  get showFullscreenBtnProp() {
    return this.showFullscreenBtn;
  }
  set showFullscreenBtnProp(val: boolean) {
    this.showFullscreenBtn = val;
    this.updateFullscreenButton();
  }

  // 判断是否应显示切换按钮
  private shouldShowToggleButton(): boolean {
    // enableHexToggle为布尔属性，存在即为true
    // 兼容老属性show-hex
    const enableHex = this.hasAttribute('enableHexToggle') && this.getAttribute('enableHexToggle') !== 'false';
    const showHex = this.hasAttribute('show-hex') && this.getAttribute('show-hex') !== 'false';
    return enableHex || showHex;
  }

  // 设置当前显示模式
  private setDisplayMode(mode: 'parsed' | 'hex') {
    this.displayMode = mode;
  }

  // 渲染当前模式内容
  private async renderCurrentMode(data: PcapData) {
    if (this.displayMode === 'hex') {
      const hexHtml = await this.renderer.renderPcapData(data, 'hex', this.useCanvas);
      this.contentElement.innerHTML = `<div class="hex-content">${hexHtml}</div>`;
      if (this.useCanvas) {
        // 检查是否有多个canvas
        const canvases = this.contentElement.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          if (canvas.id && window.__pcapHexCanvasData__ && window.__pcapHexCanvasData__[canvas.id]) {
            const { lines, lineStart } = window.__pcapHexCanvasData__[canvas.id];
            HexCanvasRenderer.draw(canvas as HTMLCanvasElement, lines, lineStart || 0);
            delete window.__pcapHexCanvasData__[canvas.id];
          }
        });
        // 监听resize自适应
        if (!this._resizeHandler) {
          this._resizeHandler = () => {
            const canvases = this.contentElement.querySelectorAll('canvas');
            canvases.forEach(canvas => {
              const lines = (canvas as HTMLCanvasElement)._hexLines;
              const lineStart = (canvas as HTMLCanvasElement)._hexLineStart || 0;
              if (lines) HexCanvasRenderer.draw(canvas as HTMLCanvasElement, lines, lineStart);
            });
          };
          window.addEventListener('resize', this._resizeHandler);
        }
      }
    } else {
      const parsedHtml = await this.renderer.renderPcapData(data, 'parsed');
      this.contentElement.innerHTML = `<div class="parsed-content">${parsedHtml}</div>`;
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
    }
    this.updateContentDisplayMode();
  }

  // 元素插入DOM时回调
  async connectedCallback() {
    this.updateLanguage();
    this.setDisplayMode('parsed');
    await this.loadPcapData();
  }

  // 属性变化时回调
  async attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'src' && oldValue !== newValue) {
      await this.loadPcapData();
    } else if (name === 'lang' && oldValue !== newValue) {
      this.updateLanguage();
      await this.loadPcapData();
    } else if (name === 'enableHexToggle' && oldValue !== newValue) {
      this.setDisplayMode('parsed');
      if (this.cachedPcapData) {
        await this.renderPcapData(this.cachedPcapData);
      }
    } else if (name === 'showfullscreenbtn' && oldValue !== newValue) {
      this.showFullscreenBtn = newValue !== null && newValue !== 'false';
      this.updateFullscreenButton();
    } else if (name === 'useCanvas' && oldValue !== newValue) {
      if (this.cachedPcapData) {
        await this.renderPcapData(this.cachedPcapData);
      }
    }
  }

  // 根据lang属性设置当前语言
  private updateLanguage() {
    const lang = this.getAttribute('lang') || 'zh-cn';
    this.i18nManager.setLanguage(lang);
  }

  // 根据show-hex属性设置显示模式
  private updateDisplayMode() {
    const showHex = this.getAttribute('show-hex');
    this.displayMode = showHex === 'true' ? 'hex' : 'parsed';
  }

  // 获取国际化文本
  private async getText(key: LanguageKey): Promise<string> {
    return await this.i18nManager.getText(key);
  }

  // 加载外部CSS样式
  private setupStyles() {
    // 防止重复插入样式
    if (this.stylesInjected) return;
    this.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --mono-font: 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
        --border-radius: 4px;
        --border-color: #e5e7eb;
        --bg-light: #fafafa;
        --bg-white: #fff;
        --bg-gray: #f3f4f6;
        --bg-gray-dark: #f8f9fa;
        --color-dark: #1f2937;
        --color-gray: #6b7280;
        --color-light: #374151;
        --font-size-base: 12px;
        --font-size-small: 10px;
        --font-size-large: 15px;
        display: block;
        font-family: var(--mono-font);
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 12px;
        margin: 12px 0;
        background: var(--bg-light);
        font-size: var(--font-size-base);
        line-height: 1.4;
        position: relative;
      }
      .loading {
        text-align: center;
        padding: 16px;
        color: #666;
        font-size: var(--font-size-base);
      }
      .error {
        color: #d32f2f;
        background: #ffebee;
        padding: 8px 10px;
        border-radius: 3px;
        margin: 6px 0;
        font-size: 11px;
        border-left: 3px solid #d32f2f;
      }
      .format-toggle {
        position: absolute;
        top: 6px;
        right: 44px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: var(--border-radius);
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
        z-index: 10;
        font-family: inherit;
        width: auto;
        height: 28px;
        vertical-align: middle;
      }
      .fullscreen-toggle {
        position: absolute;
        top: 6px;
        right: 8px;
        z-index: 20;
        background: #eee;
        border: none;
        border-radius: 4px;
        margin-left: 6px;
        cursor: pointer;
        vertical-align: middle;
        width: 28px;
        height: 28px;
        display: inline-block;
      }
      .format-toggle:hover { background: #2563eb; }
      .format-toggle:active { background: #1d4ed8; }
      .format-toggle.loading {
        opacity: 0.6;
        pointer-events: none;
        cursor: wait;
      }
      .summary {
        background: var(--bg-gray);
        padding: 10px;
        border-radius: var(--border-radius);
        margin-bottom: 12px;
        border: 1px solid var(--border-color);
      }
      .summary h3 {
        margin: 0 0 6px 0;
        color: var(--color-light);
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .packets h3 {
        margin: 6px 6px 6px 18px;
        color: var(--color-light);
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .summary-grid {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .card, .summary-item, .detail-item, .packet-info .info-item {
        background: var(--bg-white);
        border-radius: var(--border-radius);
        border: 1px solid var(--border-color);
        padding: 6px 8px;
        text-align: center;
        min-width: 0;
      }
      .summary-item { flex: 1; }
      .label-small, .summary-item .label, .packet-info .info-label {
        font-size: var(--font-size-small);
        color: var(--color-gray);
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.3px;
      }
      .value-strong, .summary-item .value, .packet-info .info-value, .detail-item strong {
        font-size: var(--font-size-large);
        font-weight: 600;
        color: var(--color-dark);
        margin-top: 2px;
      }
      .summary-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
        font-size: 11px;
        line-height: 1.4;
      }
      .detail-item {
        color: var(--color-light);
        background: var(--bg-gray-dark);
        white-space: nowrap;
      }
      .packets {
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-white);
      }
      .packet.even { background: var(--bg-white); }
      .packet.odd { background: #f8fafc; }
      .packet {
        margin: 0;
        padding: 12px 16px;
        border: none;
        border-radius: 0;
        box-shadow: none;
        transition: background-color 0.2s ease;
        position: relative;
      }
      .packet:hover { background-color: var(--bg-gray) !important; }
      .packet-divider {
        height: 1px;
        background: var(--border-color);
        margin: 0;
        opacity: 0.6;
      }
      .packet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--bg-gray);
        font-size: 11px;
      }
      .packet-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .packet-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 6px;
        font-size: var(--font-size-small);
      }
      .packet-info .info-item {
        display: flex;
        justify-content: space-between;
        padding: 2px 4px;
        background: var(--bg-gray);
        border-radius: 2px;
      }
      .packet-data {
        background: var(--bg-gray-dark);
        padding: 8px;
        border-radius: 3px;
        font-family: var(--mono-font);
        font-size: var(--font-size-small);
        line-height: 1.3;
        max-height: 200px;
        overflow-y: auto;
        word-break: break-all;
        border: 1px solid #e9ecef;
        color: var(--color-light);
      }
      .hex-data {
        background: var(--bg-gray-dark);
        padding: 14px 12px 14px 18px;
        border-radius: var(--border-radius);
        font-family: var(--mono-font);
        font-size: var(--font-size-base);
        line-height: 1.6;
        font-weight: 500;
        word-break: break-all;
        border: 1px solid #e9ecef;
        color: #23272e;
        overflow-x: auto;
      }
      .hex-data pre {
        margin: 0;
        white-space: pre;
        word-break: break-all;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        font-weight: inherit;
      }
      .hex-data pre .hex-line {
        display: flex;
        align-items: center;
        padding: 0 2px;
        min-height: 1.6em;
      }
      .hex-data pre .hex-line:nth-child(even) {
        background: var(--bg-gray);
      }
      .hex-data pre .hex-offset {
        color: #9ca3af;
        min-width: 48px;
        display: inline-block;
        text-align: right;
        margin-right: 10px;
        font-weight: 400;
      }
      .hex-data pre .hex-bytes {
        color: #23272e;
        width: 330px;
        display: inline-block;
        font-variant-ligatures: none;
      }
      .hex-data pre .hex-bytes span {
        display: inline-block;
        min-width: 22px;
        text-align: center;
      }
      .hex-data pre .hex-ascii {
        color: var(--color-gray);
        margin: 6px 6px 6px 18px;
        font-weight: 400;
        display: inline-block;
        white-space: pre;
      }
      .hex-data pre .hex-sep {
        color: var(--border-color);
      }
      .protocol-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        color: white;
        background: var(--color-gray);
      }
      .protocol-badge.smtp { background: #059669; }
      .protocol-badge.tcp { background: #2563eb; }
      .protocol-badge.udp { background: #7c3aed; }
      .protocol-badge.icmp { background: #dc2626; }
      .protocol-badge.arp { background: #ea580c; }
      .protocol-badge.http { background: #059669; }
      .protocol-badge.https { background: #059669; }
      .content, .parsed-content, .hex-content {
        position: static;
      }
      .fullscreen {
        position: fixed !important;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        background: #fff !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.12);
        overflow: auto !important;
      }
      :host(.fullscreen) {
        position: fixed !important;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        background: #fff !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.12);
        overflow: auto !important;
      }
      @media (max-width: 768px) {
        :host {
          padding: 8px;
          font-size: 11px;
        }
        .summary-grid { flex-direction: column; gap: 6px; }
        .packet-info { grid-template-columns: 1fr; gap: 4px; }
        .packet-header { flex-direction: column; align-items: flex-start; gap: 4px; }
      }
    `;
    this.shadow.appendChild(style);
  }

  // 初始化各个DOM元素内容
  private async setupElements() {
    this.setupLoadingElement();
    this.setupErrorElement();
    this.setupContentElement();
    await this.setupToggleButton();
    await this.setupFullscreenButton();
    this.appendElementsToShadowRoot();
    this.initContentDisplay();
  }

  private setupLoadingElement() {
    this.loadingElement.className = 'loading';
  }

  private setupErrorElement() {
    this.errorElement.className = 'error';
    this.errorElement.style.display = 'none';
  }

  private setupContentElement() {
    this.contentElement.className = 'content';
  }

  private async setupToggleButton() {
    this.toggleButton.className = 'format-toggle';
    this.toggleButton.style.display = 'none';
    this.toggleButton.addEventListener('click', () => this.toggleDisplayMode());
    this.toggleButton.textContent = await this.getText('loading');
  }

  private async setupFullscreenButton() {
    this.fullscreenButton = document.createElement('button');
    this.fullscreenButton.className = 'fullscreen-toggle';
    const texts = await this.i18nManager.getAllTexts();
    this.fullscreenButton.title = texts ? (this.fullscreen ? texts.exitFullscreen : texts.fullscreen) : '';
    this.updateFullscreenButtonIcon();
    this.fullscreenButton.style.display = this.showFullscreenBtn ? 'inline-block' : 'none';
    this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
  }

  private appendElementsToShadowRoot() {
    this.shadow.appendChild(this.loadingElement);
    this.shadow.appendChild(this.errorElement);
    this.shadow.appendChild(this.contentElement);
    this.shadow.appendChild(this.toggleButton);
    this.shadow.appendChild(this.fullscreenButton!);
  }

  private initContentDisplay() {
    this.updateContentDisplayMode();
    this.updateFullscreenButton();
  }

  // 切换显示模式
  private async toggleDisplayMode() {
    if (!this.shouldShowToggleButton()) return;
    this.toggleButton.disabled = true; // loading状态
    this.toggleButton.classList.add('loading');
    // 国际化 loading 文本（优先buttonLoading，没有则用loading）
    let loadingText = '';
    try {
      loadingText = await this.getText('buttonLoading');
    } catch {
      loadingText = await this.getText('loading');
    }
    this.toggleButton.innerHTML = '<span class="spinner" style="display:inline-block;vertical-align:middle;margin-right:6px;width:16px;height:16px;"><svg width="16" height="16" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/></circle></svg></span>' + loadingText;
    this.toggleButton.style.background = '#a5b4fc';
    this.toggleButton.style.opacity = '0.7';
    this.setDisplayMode(this.displayMode === 'parsed' ? 'hex' : 'parsed');
    await this.updateToggleButton();
    if (this.cachedPcapData) {
      await this.renderCurrentMode(this.cachedPcapData);
    }
    this.toggleButton.disabled = false;
    this.toggleButton.classList.remove('loading');
    this.toggleButton.style.background = '';
    this.toggleButton.style.opacity = '';
  }

  // 更新切换按钮文本
  private async updateToggleButton() {
    if (!this.shouldShowToggleButton()) return;
    const buttonText = this.displayMode === 'parsed'
      ? await this.getText('showHex')
      : await this.getText('showParsed');
    this.toggleButton.textContent = buttonText;
  }

  // 根据当前模式切换内容显示
  private updateContentDisplayMode() {
    const parsedDiv = this.contentElement.querySelector('.parsed-content') as HTMLElement;
    const hexDiv = this.contentElement.querySelector('.hex-content') as HTMLElement;
    if (parsedDiv) parsedDiv.style.display = this.displayMode === 'parsed' ? 'block' : 'none';
    if (hexDiv) hexDiv.style.display = this.displayMode === 'hex' ? 'block' : 'none';
  }

  // 加载PCAP数据并渲染
  private async loadPcapData() {
    const src = this.getAttribute('src');
    // 判断src为空、未定义、仅空白、或包含未渲染模板变量（如{{...}}）
    if (!src || !src.trim() || /\{\{.*\}\}/.test(src)) {
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
      this.cachedPcapData = pcapData; // 缓存数据
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
    // 统一中文风格提示
    console.error('加载PCAP失败:', error); // 记录详细日志
    this.showError(errorMessage || '加载PCAP文件失败');
  }

  /**
   * 显示加载中状态
   * 注意：此方法不会改变任何功能或字符串内容，仅增强健壮性和用户体验
   */
  private async showLoading() {
    const { loadingElement, errorElement, contentElement, toggleButton } = this;
  
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
      if (toggleButton) {
        toggleButton.style.display = 'none';
      }
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
    if (this.toggleButton) {
      this.toggleButton.style.display = 'none';
    }
  
    // 设置错误信息，中文风格
    this.errorElement.textContent = message || '发生错误，请重试';
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
    if (this.shouldShowToggleButton()) {
      this.toggleButton.style.display = 'block';
      await this.updateToggleButton();
    } else {
      this.toggleButton.style.display = 'none';
      this.setDisplayMode('parsed');
    }
    try {
      await this.renderCurrentMode(data);
    } catch (error) {
      console.error('渲染PCAP数据失败:', error);
      this.contentElement.style.display = 'none';
      this.errorElement.style.display = 'block';
      this.errorElement.textContent = '加载数据时发生错误';
    }
  }

  private toggleFullscreen() {
    this.fullscreen = !this.fullscreen;
    this.updateFullscreenState();
    this.updateFullscreenButton();
  }
  private updateFullscreenState() {
    // 兼容:host和shadow host
    const host = this.shadow.host as HTMLElement;
    if (this.fullscreen) {
      this.classList.add('fullscreen');
      if (host) host.classList.add('fullscreen');
    } else {
      this.classList.remove('fullscreen');
      if (host) host.classList.remove('fullscreen');
    }
  }
  private updateFullscreenButton() {
    if (!this.fullscreenButton) return;
    this.fullscreenButton.style.display = this.showFullscreenBtn ? 'inline-block' : 'none';
    this.i18nManager.getAllTexts().then(texts => {
      if (this.fullscreenButton && texts) {
        this.fullscreenButton.title = this.fullscreen ? texts.exitFullscreen : texts.fullscreen;
      }
    });
    this.updateFullscreenButtonIcon();
  }
  private updateFullscreenButtonIcon() {
    if (!this.fullscreenButton) return;
    if (this.fullscreen) {
      // 恢复图标（两个对角箭头）
      this.fullscreenButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><polyline points="4,12 4,8 8,8" stroke="#888" stroke-width="2" fill="none"/><polyline points="12,4 12,8 8,8" stroke="#888" stroke-width="2" fill="none"/></svg>';
    } else {
      // 非全屏：方框图标
      this.fullscreenButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="2" fill="none" stroke="#888" stroke-width="2"/></svg>';
    }
  }
}

// 注册自定义元素，标签名为pcap-element
customElements.define('pcap-element', PcapElement); 