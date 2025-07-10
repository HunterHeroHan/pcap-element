# React 集成 pcap-element 示例

## 安装依赖

```bash
npm install
```

## 启动示例

```bash
npm start
```

## 集成方式

- 直接在 React 组件中引入 `pcap-element`：

```jsx
import 'pcap-element/dist/pcap-element.js';
import 'pcap-element/dist/styles.css';

export default function App() {
  return <pcap-element src="/your-file.pcap"></pcap-element>;
}
``` 