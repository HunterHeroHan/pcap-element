# src 目录说明

本目录为 pcap-element 项目的核心源码，结构清晰，便于维护和扩展。

## 目录结构

```

src/
  ├── pcap-element-lib.ts      # 库入口，导出主组件和工具
  ├── pcap-element.ts           # Web Component 主体，自定义元素实现
  ├── pcap-element.test.ts      # Web Component 单元测试
  ├── utils/                    # 工具函数与PCAP解析器
  ├── renderers/                # 渲染相关逻辑
  ├── types/                    # 类型定义
  ├── i18n/                     # 国际化相关
  └── README.md                 # 本说明文件
```

## 各文件/目录说明

- **pcap-element-lib.ts**
  - 项目主入口，统一导出 Web Component、解析器、渲染器、工具类和类型。
- **pcap-element.ts**
  - 自定义元素 `<pcap-element>` 的实现，负责加载、解析、渲染PCAP文件。
- **pcap-element.test.ts**
  - Web Component 的基础单元测试。
- **utils/**
  - `format-utils.ts`：常用格式化工具，如字节、MAC、IP等。
  - `pcap-parser.ts`：PCAP文件解析器，负责二进制解析、协议识别、统计等。
  - `*.test.ts`：工具/解析器的单元测试。
- **renderers/**
  - `pcap-renderer.ts`：将解析后的PCAP数据渲染为HTML结构。
- **types/**
  - `index.ts`：全局类型定义，包括数据结构、国际化key等。
- **i18n/**
  - `i18n-manager.ts`：国际化管理器，负责多语言加载与切换。
  - `languages.json`：多语言文本资源。

## 开发建议
- 所有新功能建议先在 `types/` 定义类型，再在对应目录实现。
- 单元测试建议与实现文件同目录、同名（加 `.test.ts`）。
- 入口和导出统一通过 `pcap-element-lib.ts` 管理。

---

如需详细API和用法，请参考项目根目录的 `README.md`。 