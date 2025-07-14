import '../src/pcap-element';

describe('PcapElement', () => {
  test('should show error if no src attribute', async () => {
    document.body.innerHTML = '<pcap-element></pcap-element>';
    const el = document.querySelector('pcap-element') as any;
    await new Promise(r => setTimeout(r, 20)); // 等待异步渲染
    expect(el.shadowRoot.innerHTML).toContain('src');
  });

  test('should show only parsed mode and no toggle button by default', async () => {
    document.body.innerHTML = '<pcap-element src="test"></pcap-element>';
    const el = document.querySelector('pcap-element') as any;
    await new Promise(r => setTimeout(r, 20));
    const btn = el.shadowRoot.querySelector('.format-toggle');
    expect(btn).not.toBeNull();
    expect(btn.style.display).toBe('none');
    expect(el.displayMode).toBe('parsed');
  });

  test('should show toggle button and allow mode switch when show-hex is true', async () => {
    document.body.innerHTML = '<pcap-element src="test" show-hex="true"></pcap-element>';
    const el = document.querySelector('pcap-element') as any;
    // 等待数据加载完成
    for (let i = 0; i < 20 && !el.cachedPcapData; i++) {
      await new Promise(r => setTimeout(r, 10));
    }
    const btn = el.shadowRoot.querySelector('.format-toggle');
    expect(btn).not.toBeNull();
    expect(btn.style.display).toBe('block');
    expect(el.displayMode).toBe('parsed');
    // 模拟点击切换
    btn.click();
    await new Promise(r => setTimeout(r, 20));
    expect(el.displayMode).toBe('hex');
    btn.click();
    await new Promise(r => setTimeout(r, 20));
    expect(el.displayMode).toBe('parsed');
  });

  test('should always be parsed mode and no toggle button when show-hex is false', async () => {
    document.body.innerHTML = '<pcap-element src="test" show-hex="false"></pcap-element>';
    const el = document.querySelector('pcap-element') as any;
    await new Promise(r => setTimeout(r, 20));
    const btn = el.shadowRoot.querySelector('.format-toggle');
    expect(btn).not.toBeNull();
    expect(btn.style.display).toBe('none');
    expect(el.displayMode).toBe('parsed');
  });
}); 