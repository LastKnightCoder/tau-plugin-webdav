import { definePlugin, type ProviderField, type ProviderForm } from "@tau/plugins";
import { uploadWebDav } from "./upload";
import { createWebDavSyncProvider, bindWebDavTransport } from "./sync";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

const account: readonly ProviderField[] = [
  {
    key: "url",
    label: "服务地址",
    type: "url",
    placeholder: "https://dav.example.com/dav",
    summary: true,
  },
  { key: "username", label: "用户名", type: "text" },
  {
    key: "password",
    label: "密码",
    type: "secret",
    description: "坚果云等服务请使用「应用密码」",
  },
];

const syncForm: ProviderForm = {
  groups: [
    { title: "账号", fields: account },
    {
      title: "存储位置",
      fields: [
        { key: "pathPrefix", label: "目录", type: "text", optional: true, placeholder: "sync", summary: true },
      ],
    },
  ],
};

const uploadForm: ProviderForm = {
  groups: [
    { title: "账号", fields: account },
    {
      title: "存储位置",
      description: "返回的资源地址须能公开访问",
      fields: [
        { key: "pathPrefix", label: "目录", type: "text", optional: true, placeholder: "uploads", summary: true },
        {
          key: "publicBaseUrl",
          label: "公开地址前缀",
          type: "url",
          optional: true,
          description: "不填则用服务地址拼接",
        },
      ],
    },
  ],
};

export default definePlugin({
  ...__PLUGIN_META__,
  create: () => ({
    activate(context) {
      context.register(bindWebDavTransport(context.fetch));
      context.sync.register({
        id: context.pluginId,
        name: "WebDAV",
        create: config => createWebDavSyncProvider(config),
      });
      context.upload.register({
        id: context.pluginId,
        name: "WebDAV",
        upload: (file, config, signal) => uploadWebDav(context.fetch, file, config, signal),
      });
      context.settings.register({ id: "upload", title: "WebDAV", target: "upload", form: uploadForm });
      context.settings.register({ id: "sync", title: "WebDAV", target: "sync", form: syncForm });
    },
  }),
});
