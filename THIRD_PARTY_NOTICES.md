# 第三方声明

本插件随 `dist/` 分发的产物包含以下第三方代码：

## Vue

- 项目：https://github.com/vuejs/core
- 版本：3.5.x
- 许可证：MIT
- 用途：插件前端框架（运行时打包进 `dist/assets/*.js`）

## otools-plugin-sdk

- 来源：npm 发布版 `otools-plugin-sdk`
- 许可证：Apache-2.0
- 用途：跨运行时桥接，仅使用 `otools-plugin-sdk/runtime` 的 `invoke` / `openExternal` / `isOtoolsPluginRuntime`

## GitHub REST API

插件通过 GitHub 官方 REST API v3 读写仓库数据，不包含 GitHub 的商标或站点资源；
仓库、README、Issue 等内容版权归各自作者所有。OAuth 授权由 GitHub 官方设备流完成，
插件不接触用户的账号密码，也不保存 client_secret。
