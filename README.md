# pcap-element

一个可复用的 Web Component，自定义标签 `<pcap-element>`，用于在网页中直接预览和分析PCAP网络抓包文件。

---

A reusable Web Component `<pcap-element>` for previewing and analyzing PCAP network capture files directly in the browser.

---

## ✨ 特性 | Features

- 一行代码集成PCAP文件预览
- 支持TCP/UDP/ICMP/SMTP/ARP/IPv6等协议解析
- 现代化UI，支持自定义样式
- 纯前端，无需后端依赖
- 支持npm、CDN两种集成方式

- One-line integration for PCAP preview
- Supports TCP/UDP/ICMP/SMTP/ARP/IPv6 protocol parsing
- Modern UI, customizable styles
- Pure frontend, no backend required
- Available via npm or CDN

## 📦 安装 | Installation

```bash
npm install pcap-element
```

## 🚀 快速上手 | Quick Start

### 1. 在你的入口文件引入组件和样式 | Import in your entry file

```js
import 'pcap-element/dist/pcap-element.js';
import 'pcap-element/dist/styles.css';
```

### 2. 在HTML中直接使用 | Use in HTML

```html
<pcap-element src="/your-file.pcap"></pcap-element>
```

### 3. 支持CDN方式 | CDN Usage

```html
<link rel="stylesheet" href="https://unpkg.com/pcap-element/dist/styles.css">
<script type="module" src="https://unpkg.com/pcap-element/dist/pcap-element.js"></script>
<pcap-element src="/your-file.pcap"></pcap-element>
```

## 📝 API

### 属性 | Attributes

| 属性 | 类型   | 说明                 |
|------|--------|----------------------|
| src  | string | PCAP文件的URL或路径  |
| lang | string | 语言（可选，默认zh-cn，支持en-us）|

### 事件 | Events

| 事件名 | 说明 |
|--------|------|
| 无     |      |

### 方法 | Methods

| 方法 | 说明 |
|------|------|
| 无   |      |

## 🧩 类型声明 | Type Declarations

如需类型提示，可在TypeScript项目中：

```ts
import type { PcapPacket, PcapData } from 'pcap-element/dist/pcap-parser';
```

## 🎨 样式自定义 | Style Customization

- 默认样式为现代化卡片风格
- 可通过覆盖CSS变量或自定义class进行主题定制
- 也可直接修改 `dist/styles.css`

- Modern card style by default
- Customize via CSS variables or class overrides
- Or edit `dist/styles.css` directly

## 🌐 常见问题 | FAQ

### 1. PCAP文件无法加载？

- 检查src路径是否正确、文件是否支持CORS、服务器是否返回二进制内容

### 2. 只支持标准PCAP格式？

- 是，magic number需为a1b2c3d4/d4c3b2a1/a1b23c4d/4d3cb2a1

### 3. 如何在React/Vue/Angular中用？

- 只需在入口引入js/css，然后像普通HTML标签一样用即可


## 🤝 贡献 | Contributing

- 欢迎PR、Issue、建议
- 代码风格TypeScript+ESLint
- 入口文件：src/pcap-element-lib.ts

- PRs, issues, and suggestions welcome
- Code style: TypeScript + ESLint
- Entry: src/pcap-element-lib.ts

## 📄 License

MIT

---

## English Version

### Introduction

A reusable Web Component `<pcap-element>` for previewing and analyzing PCAP network capture files directly in the browser.

## Features

- One-line integration for PCAP preview
- Supports TCP/UDP/ICMP/SMTP/ARP/IPv6 protocol parsing
- Modern UI, customizable styles
- Pure frontend, no backend required
- Available via npm or CDN

## Installation

```bash
npm install pcap-element
```

## Quick Start

1 Import in your entry file:

```js
import 'pcap-element/dist/pcap-element.js';
import 'pcap-element/dist/styles.css';
```

2 Use in HTML:

```html
<pcap-element src="/your-file.pcap"></pcap-element>
```

3 Or via CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/pcap-element/dist/styles.css">
<script type="module" src="https://unpkg.com/pcap-element/dist/pcap-element.js"></script>
<pcap-element src="/your-file.pcap"></pcap-element>
```

## API

### Attributes

| Name | Type   | Description                 |
|------|--------|----------------------------|
| src  | string | URL or path to PCAP file   |
| lang | string | Language (optional, default zh-cn, supports en-us) |

### Events

None

### Methods

None

## Type Declarations

For TypeScript:

```ts
import type { PcapPacket, PcapData } from 'pcap-element/dist/pcap-parser';
```

## Style Customization

- Modern card style by default
- Customize via CSS variables or class overrides
- Or edit `dist/styles.css` directly

## FAQ

1. PCAP file not loading?
   - Check src path, CORS, and server binary response
2. Only standard PCAP format supported?
   - Yes, magic number must be a1b2c3d4/d4c3b2a1/a1b23c4d/4d3cb2a1
3. How to use in React/Vue/Angular?
   - Import js/css in your entry and use `<pcap-element>` as a normal HTML tag

## Contributing

- PRs, issues, and suggestions welcome
- Code style: TypeScript + ESLint
- Entry: src/pcap-element-lib.ts

## License

MIT
