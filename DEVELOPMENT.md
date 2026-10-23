# 开发说明

当前依赖、平台边界与验证步骤见 [兼容性说明](COMPATIBILITY.md)。

## 自动发布

本仓库的.github/workflows/release.yml与公开模板一致。同步更新package.json和manifest.json版本并提交后，推送对应版本tag即可自动安装依赖、运行测试（若定义）、构建并将ZIP上传到GitHub Release，无需手动上传或配置额外Token。

```sh
version=$(node -p "require('./manifest.json').version")
git tag "v$version"
git push origin HEAD
git push origin "v$version"
```

tag也可不带v前缀，版本必须与两个文件一致；预发布版本自动标记为Pre-release。Actions失败可重跑，已有Release会更新同名ZIP。已发布版本不要移动tag，代码修复应提高版本再发布。仓库需启用Actions并允许contents:write。Git远程统一使用SSH；该流程不自动提交插件中心审核或更新客户端固定产物。

基于公开 Tau 模板，使用 SDK 0.10.0、Node.js 22及以上和pnpm 11.9.0。不依赖宿主源码或本地SDK快照。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

产物为dist/tau.sync-webdav-0.1.0.zip。src/index.tsx在activate中注册同步配置组件和五方法提供方；src/sync.ts通过webdav 5.10.0官方浏览器构建实现协议，main.js为唯一执行入口。

网络使用SDK公开getPatcher扩展绑定context.fetch。SDK完整打包进本插件，其patcher不与宿主或其他插件共享；停用回收绑定，不修改globalThis.fetch。构建保留模板external约定，不包含Node运行时入口。

普通上传允许覆盖，目录递归创建失败后仍尝试PUT。条件创建使用If-None-Match:*，412返回false；其他上传失败也返回false，由客户端确认提交状态。列举递归遍历目录，仅忽略404，认证和服务错误继续抛出。同步引擎、快照、冲突及资源调度由宿主负责。

测试使用官方浏览器构建和本机隔离HTTP服务，覆盖认证、二进制、中文/空格路径、MKCOL、PROPFIND、递归、普通覆盖和条件创建竞争。真实Electron生命周期验收在宿主sync-storage脚本中执行，不将Node客户端测试冒充渲染进程验收。
