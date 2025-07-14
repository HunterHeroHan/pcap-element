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
- 内置样式和国际化，无外部依赖
- 支持解析模式和16进制模式切换
- 16进制包标题支持中英文国际化
- 切换按钮有loading状态，防止误触
- 代码结构优化，方法职责清晰，类型安全
- ESLint统一代码风格，自动修复

- One-line integration for PCAP preview
- Supports TCP/UDP/ICMP/SMTP/ARP/IPv6 protocol parsing
- Modern UI, customizable styles
- Pure frontend, no backend required
- Available via npm or CDN
- Built-in styles and i18n, no external dependencies
- Supports parsed and hex display modes
- Hex view title supports i18n (EN/中文)
- Toggle button has loading state to prevent misclicks
- Refactored code structure, clear methods, type safety
- ESLint unified code style, auto-fix

## 📦 安装 | Installation

```bash
npm install pcap-element
```

## 🚀 快速上手 | Quick Start

### 1. 在你的入口文件引入组件 | Import in your entry file

```js
// 只需要引入JS文件，样式已内置
import 'pcap-element/dist/pcap-element.esm.min.js';
```

### 2. 在HTML中直接使用 | Use in HTML

```html
<!-- 基础用法 -->
<pcap-element src="/your-file.pcap"></pcap-element>

<!-- 指定语言 -->
<pcap-element src="/your-file.pcap" lang="en-us"></pcap-element>

<!-- 启用切换按钮（可切换16进制/解析模式） -->
<pcap-element src="/your-file.pcap" show-hex="true"></pcap-element>
```

### 3. 支持CDN方式 | CDN Usage

```html
<!-- 只需要引入JS文件 -->
<script type="module" src="https://unpkg.com/pcap-element/dist/pcap-element.esm.min.js"></script>

<pcap-element src="/your-file.pcap"></pcap-element>
```

## 📝 API

### 属性 | Attributes

| 属性 | 类型   | 默认值 | 说明                 |
|------|--------|--------|----------------------|
| src  | string | -      | PCAP文件的URL或路径  |
| lang | string | zh-cn  | 语言（支持zh-cn, en-us）|
| show-hex | string | false | 是否显示切换按钮（true/false，控制能否切换16进制/解析模式）|

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
import type { PcapPacket, PcapData } from 'pcap-element/dist/pcap-element.d.ts';
```

## 🎨 样式自定义 | Style Customization

- 默认样式已内置，无需额外CSS文件
- 可通过Shadow DOM中的CSS变量进行主题定制
- 支持响应式设计，适配移动端

- Built-in styles, no additional CSS required
- Customize via CSS variables in Shadow DOM
- Responsive design, mobile-friendly

## 🧑‍💻 代码风格与结构 | Code Style & Structure

- 采用 ESLint 统一代码风格，支持 TypeScript 推荐规则
- 复杂方法已拆分为职责单一的辅助方法，便于维护
- 关键类型均有 TypeScript 明确声明，避免 any
- 切换按钮有 loading 状态，防止误触
- 16进制包标题支持中英文国际化

## 🌐 常见问题 | FAQ

### 1. PCAP文件无法加载？

- 检查src路径是否正确、文件是否支持CORS、服务器是否返回二进制内容

### 2. 只支持标准PCAP格式？

- 是，magic number需为a1b2c3d4/d4c3b2a1/a1b23c4d/4d3cb2a1

### 3. 如何在React/Vue/Angular中用？

- 只需在入口引入js文件，然后像普通HTML标签一样用即可

### 4. 为什么不需要引入CSS文件？

- 样式已内置到组件中，避免外部依赖和404错误

### 5. 如何切换显示模式？

- 使用`show-hex`属性：`show-hex="true"`显示切换按钮，允许用户切换16进制/解析模式；不加或为false时始终为解析模式

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
- Built-in styles and i18n, no external dependencies
- Supports parsed and hex display modes
- Hex view title supports i18n (EN/中文)
- Toggle button has loading state to prevent misclicks
- Refactored code structure, clear methods, type safety
- ESLint unified code style, auto-fix

## Installation

```bash
npm install pcap-element
```

## Quick Start

1 Import in your entry file:

```js
// Only need to import JS file, styles are built-in
import 'pcap-element/dist/pcap-element.esm.min.js';
```

2 Use in HTML:

```html
<!-- Basic usage -->
<pcap-element src="/your-file.pcap"></pcap-element>

<!-- Specify language -->
<pcap-element src="/your-file.pcap" lang="en-us"></pcap-element>

<!-- Enable toggle button (switch between hex/parsed) -->
<pcap-element src="/your-file.pcap" show-hex="true"></pcap-element>
```

3 Or via CDN:

```html
<!-- Only need to import JS file -->
<script type="module" src="https://unpkg.com/pcap-element/dist/pcap-element.esm.min.js"></script>

<pcap-element src="/your-file.pcap"></pcap-element>
```

## API

### Attributes

| Name | Type   | Default | Description                 |
|------|--------|---------|----------------------------|
| src  | string | -       | URL or path to PCAP file   |
| lang | string | zh-cn   | Language (supports zh-cn, en-us) |
| show-hex | string | false | Show toggle button (true/false, controls if user can switch hex/parsed mode) |

### Events

None

### Methods

None

## Type Declarations

For TypeScript:

```ts
import type { PcapPacket, PcapData } from 'pcap-element/dist/pcap-element.d.ts';
```

## Style Customization

- Built-in styles, no additional CSS required
- Customize via CSS variables in Shadow DOM
- Responsive design, mobile-friendly

## Code Style & Structure

- ESLint unified code style, TypeScript recommended rules
- Complex methods split into clear helpers for maintainability
- All key types are strictly typed, no any
- Toggle button has loading state to prevent misclicks
- Hex view title supports i18n (EN/中文)

## FAQ

1. PCAP file not loading?
   - Check src path, CORS, and server binary response
2. Only standard PCAP format supported?
   - Yes, magic number must be a1b2c3d4/d4c3b2a1/a1b23c4d/4d3cb2a1
3. How to use in React/Vue/Angular?
   - Import js file in your entry and use `<pcap-element>` as a normal HTML tag
4. Why no CSS file needed?
   - Styles are built-in to avoid external dependencies and 404 errors
5. How to switch display modes?
   - Use `show-hex` attribute: `show-hex="true"` to enable toggle button, allowing user to switch hex/parsed mode; omit or set to false for always parsed mode

## Contributing

- PRs, issues, and suggestions welcome
- Code style: TypeScript + ESLint
- Entry: src/pcap-element-lib.ts

## License

MIT
