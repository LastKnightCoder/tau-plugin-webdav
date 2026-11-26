import { messages } from "./i18n";
import { syncForm, uploadForm } from "./forms";
import { definePlugin } from "@tau/plugins";
import { uploadWebDav } from "./upload";
import { createWebDavSyncProvider, bindWebDavTransport } from "./sync";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

export default definePlugin({
  ...__PLUGIN_META__,
  i18n: messages,
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
      context.settings.register({
        id: "upload",
        title: "WebDAV",
        target: "upload",
        form: uploadForm,
      });
      context.settings.register({ id: "sync", title: "WebDAV", target: "sync", form: syncForm });
    },
  }),
});
