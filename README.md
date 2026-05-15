# Tech Toolbox

一个基于 Vue 3 + Vite 构建的开发者工具集，聚合了常用的编解码、哈希、加解密、数据生成、数据转换、格式化和文本分析能力，适合在浏览器中快速完成日常开发辅助操作。

在线地址：<https://zooper4.github.io/toolbox/>

源码仓库：<https://github.com/zooper4/toolbox>

作者 GitHub：<https://github.com/zooper4>

开源协议：GPL-3.0-only

## 功能概览

- 编解码：统一编解码入口，支持 UTF-8、URL、Base64 / Base64URL / Base32 / Base58、Hex、Quoted-Printable、二进制、八进制、十进制字节、ASCII 码序列、Unicode 转义、HTML 实体互转；并提供 JWT 结构编解码、特殊字符转义等独立工具
- 哈希算法：MD5、SHA-1 / SHA-256 / SHA-384 / SHA-512、SM3、HMAC
- 加解密：AES、DES / 3DES、SM4、RSA、SM2、ChaCha20、HMAC / AES-CMAC 消息认证
- 数据生成：UUID、密码生成、二维码生成、Lorem Ipsum
- 数据转换：时间戳转换、时间间隔、颜色转换、JSON / XML / CSV / YAML 转换
- 格式化：命名格式转换、正则测试、代码格式化、代码压缩
- 数据分析：文本对比、文本统计、UA 解析、键盘事件查看

## 技术栈

- Vue 3
- Vite 8
- Tailwind CSS 4
- lucide-vue-next（图标）
- fast-xml-parser、yaml、prettier（结构化数据处理与格式化）
- qrcode（二维码生成）
- node-forge、sm-crypto、jsrsasign（密码学相关能力）

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认开发地址：<http://localhost:1024>

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/`。

### 本地预览生产包

```bash
npm run preview
```

## 部署说明

本项目已经配置为适配静态托管场景，如果你使用 GitHub Actions 自动部署，只需要：

1. 执行 `npm ci`
2. 执行 `npm run build`
3. 发布 `dist/` 目录

如果部署后资源路径异常，优先检查以下两点：

- 是否发布了最新的 `dist/` 构建产物
- 页面中的静态资源是否仍然写成了站点根路径 `/images/...`

## 项目脚本

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "npm run build && chown -R www-data:www-data dist/ && nginx -s reload"
}
```

说明：

- `deploy` 更偏向你自己的服务器发布流程，不适用于 GitHub Pages
- GitHub Pages 推荐直接使用 CI 发布 `dist/`

## 目录结构

```text
.
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── images/
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── shared/
│   │   └── tool-data.js
│   ├── utils/
│   ├── vue/
│   │   ├── App.vue
│   │   ├── components/
│   │   └── composables/
│   └── workers/
└── dist/
```

## 设计说明

- 首页按功能类别分组展示工具，并支持搜索
- 工具页按领域拆分为独立组件，通过 `defineAsyncComponent` 异步加载
- 部分重型能力通过 Web Worker 处理，避免阻塞主线程
- 加密和格式转换相关能力尽量在浏览器端本地完成，不依赖后端服务

## 注意事项

- DES、SHA-1、MD5 等能力保留主要用于兼容和演示，不建议用于新的安全方案
- RSA、SM2、SM4、ChaCha20 等功能依赖浏览器环境与第三方库实现，升级依赖时建议重新验证标准测试向量
- 任何敏感数据在浏览器侧处理前，都建议结合实际安全要求评估使用场景

## 验证建议

提交前建议至少执行：

```bash
npm run build
```

如涉及加密逻辑调整，可额外回归以下典型场景：

- DES ECB 无填充标准向量
- SM4 ECB 无填充标准向量
- ChaCha20 RFC 8439 向量
- RSA OAEP / PSS 与 Node.js `crypto` 结果比对

## License

本项目采用 GPL-3.0-only 许可证发布，完整条款见仓库根目录的 LICENSE 文件。

这意味着：

- 你可以在 GPL-3.0 约束下使用、复制、修改和分发本项目
- 如果你分发修改后的版本，通常也需要继续以 GPL-3.0 方式开放对应源码
- 使用、分发或二次开发前，建议先完整阅读许可证正文，确认与你的场景兼容

项目源码与后续更新会同步发布在 GitHub：<https://github.com/zooper4/toolbox>