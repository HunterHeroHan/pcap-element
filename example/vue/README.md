# Vue 集成 pcap-element 示例

## 安装依赖

```bash
npm install
```

## 启动示例

```bash
npm start
```

## 集成方式

- 直接在 Vue 组件中引入 `pcap-element`：

```vue
<template>
  <pcap-element src="/your-file.pcap"></pcap-element>
</template>
<script setup>
import 'pcap-element/dist/pcap-element.esm.min.js'
import 'pcap-element/dist/styles.css'
</script>
``` 