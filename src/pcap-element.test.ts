import './pcap-element';

describe('PcapElement', () => {
  test('should show error if no src attribute', async () => {
    document.body.innerHTML = '<pcap-element></pcap-element>';
    const el = document.querySelector('pcap-element') as any;
    await new Promise(r => setTimeout(r, 20)); // 等待异步渲染
    expect(el.shadowRoot.innerHTML).toContain('src');
  });
}); 