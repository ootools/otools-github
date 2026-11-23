# OTools GitHub 插件

在 OTools 里用 GitHub 官方 REST API v3 浏览与管理仓库：公共仓库排行榜与检索免登录，
自己的仓库用 OAuth 设备流登录管理；仓库详情（README + 文件树，只读）与 Issue 查看为辅。
所有请求走宿主 HTTP 通道以复用「设置 → 代理」，国内网络下无需在插件里单独配代理。

## 功能（v0.2）

- **排行榜（免登录）**：星标总榜 / 近期热门双榜页内切换，近期热门支持语言、时间范围、
  创建/推送日期字段与最低星标筛选。基于官方 Search API（`sort=stars` + 日期限定符），
  非第三方 trending 接口。
- **仓库检索（免登录）**：关键词 + 语言 + 排序（最佳匹配 / 星标 / 更新时间），服务端分页。
- **OAuth 设备流登录**：系统浏览器打开 `github.com/login/device`，输入 user code 授权，
  插件轮询换取 token 并存本机 localStorage。支持登出与撤销引导。
- **仓库列表**：`GET /user/repos`，名称过滤、`all/owner/private/public` 筛选、分页，
  展示语言 / 星标 / 更新时间。
- **新建仓库**：`POST /user/repos`，名称规则校验、422 冲突友好提示，支持 auto_init、
  gitignore / license 模板。
- **仓库详情（只读）**：README 渲染、按默认分支逐级浏览文件树、文本文件预览（≤1 MB）。
- **Issue**：open/closed 筛选、分页、正文与评论查看。
- **设置页**：client_id 覆盖、授权信息（登录名 / scopes / rate limit）、登出。
- **离线预览**：`?mock=1` 全功能假数据。

> 不支持：创建/评论 issue、star/fork/watch、文件编辑、PR、gist、组织仓库管理、
> GitHub Enterprise、clone/push。搜索 API 每用户/分钟有独立限额（登录 30、匿名 10）。

## 开发

```bash
npm ci
npm run dev        # http://127.0.0.1:6580
npm run build      # 类型检查 + 构建 dist/
npm test           # 发布脚本回归测试
npm run test:src   # 源码纯逻辑单测
npm run pack       # 构建 + 打包 .oplg + 校验
npm run preview    # 在 6581 端口预览 dist/
```

`?mock=1` 使用 `src/mock/` 里的假数据，不需要 token 或网络。

## OAuth 配置

插件内置 `DEFAULT_CLIENT_ID = ''`（占位）。正式使用前：

1. 在 https://github.com/settings/developers 注册 OAuth App，勾选 **Enable Device Flow**；
2. 把 Client ID 填入 `src/config.ts` 的 `DEFAULT_CLIENT_ID`（单点），或在插件「设置」页临时覆盖；
3. 授权页展示的 scope 为 `repo, read:user`（建私有仓需要 `repo`）。

OAuth Web 回调流需要 client_secret，前端插件无法安全保存，故不采用。token 只存在插件
webview 自身的 localStorage；可随时在 https://github.com/settings/applications 撤销授权。

## 发布

`v<版本>` 标签推送后，`.github/workflows/release-plugin.yml` 会构建单合包 `.oplg` 并创建
GitHub Release。仓库变量 `OTOOLS_PUBLISH_MARKET=true` 且 `release` environment 配好
`XYCLOUD_PAT` 后才会同步上架插件市场（本仓 v0.1 未上架）。

## 许可

MIT
