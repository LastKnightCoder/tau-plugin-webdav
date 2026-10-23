import { uploadWebDav } from "./upload";
import { MobileSettings } from "./mobile-settings";
import { useState } from "react";
import { definePlugin, usePluginEnvironment, type PluginSettingsProps } from "@tau/plugins";
import { Button, Input, SettingRow } from "@tau/ui";
import { createWebDavSyncProvider, bindWebDavTransport } from "./sync";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

function WebDavSettings({ syncConfig }: PluginSettingsProps) {
  const value = syncConfig?.value;
  const fields = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const [config, setConfig] = useState(() => ({
    url: String(fields.url ?? ""),
    username: String(fields.username ?? ""),
    password: String(fields.password ?? ""),
    pathPrefix: String(fields.pathPrefix ?? ""),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  if (!syncConfig) return <p>请在客户端的同步设置中配置此插件。</p>;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await syncConfig.save({ ...fields, ...config });
      setSaved(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingRow title="服务器地址" description="WebDAV 服务器 URL">
        <Input
          className="w-[260px]"
          aria-label="服务器地址"
          type="text"
          value={config.url}
          placeholder="https://example.com/dav"
          required
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          onChange={event => {
            setSaved(false);
            setConfig({ ...config, url: event.target.value });
          }}
        />
      </SettingRow>

      <SettingRow title="用户名">
        <Input
          className="w-[260px]"
          aria-label="用户名"
          type="text"
          value={config.username}
          placeholder=""
          required
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          onChange={event => {
            setSaved(false);
            setConfig({ ...config, username: event.target.value });
          }}
        />
      </SettingRow>

      <SettingRow title="密码">
        <Input
          className="w-[260px]"
          aria-label="密码"
          type="password"
          value={config.password}
          placeholder=""
          required
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          onChange={event => {
            setSaved(false);
            setConfig({ ...config, password: event.target.value });
          }}
        />
      </SettingRow>

      <SettingRow title="路径前缀" description="可选，例如 /sync">
        <Input
          className="w-[260px]"
          aria-label="路径前缀"
          type="text"
          value={config.pathPrefix}
          placeholder="/sync"
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          onChange={event => {
            setSaved(false);
            setConfig({ ...config, pathPrefix: event.target.value });
          }}
        />
      </SettingRow>

      {error && (
        <SettingRow title="">
          <p role="alert" className="text-danger text-tau-body">
            {error}
          </p>
        </SettingRow>
      )}
      {saved && (
        <SettingRow title="">
          <p role="status" className="text-ink-2 text-tau-body">
            配置已保存，可以使用客户端的检查、上传和下载。
          </p>
        </SettingRow>
      )}

      <SettingRow title="">
        <Button onClick={handleSave} loading={saving} loadingText="保存中…">
          保存同步配置
        </Button>
      </SettingRow>
    </>
  );
}

function SettingsView(props: PluginSettingsProps) {
  const environment = usePluginEnvironment();
  if (environment.platform !== "desktop") return <MobileSettings {...props} />;
  return props.uploadConfig ? <WebDavUploadSettings {...props} /> : <WebDavSettings {...props} />;
}

function WebDavUploadSettings({ uploadConfig }: PluginSettingsProps) {
  const initial = uploadConfig?.value;
  const [value, setValue] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    if (initial && typeof initial === "object" && !Array.isArray(initial))
      for (const [key, item] of Object.entries(initial))
        if (typeof item === "string") result[key] = item;
    return result;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  if (!uploadConfig) return <p>请从资源存储设置进入。</p>;
  const save = async () => {
    setSaving(true);
    try {
      await uploadConfig.save({
        ...(initial && typeof initial === "object" && !Array.isArray(initial) ? initial : {}),
        ...value,
      });
      setMessage("已保存并使用");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      {[
        ["url", "服务器地址"],
        ["username", "用户名"],
        ["password", "密码"],
        ["pathPrefix", "路径前缀"],
        ["publicBaseUrl", "公开地址前缀（可选）"],
      ].map(([key, label]) => (
        <SettingRow key={key} title={label}>
          <Input
            className="w-[260px]"
            aria-label={label}
            type={key === "password" ? "password" : "text"}
            value={value[key] ?? ""}
            autoComplete="off"
            onChange={event => setValue(previous => ({ ...previous, [key]: event.target.value }))}
          />
        </SettingRow>
      ))}
      <SettingRow title="">
        <Button loading={saving} onClick={() => void save()}>
          保存并使用
        </Button>
      </SettingRow>
      {message && <p role="status">{message}</p>}
    </>
  );
}

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
      context.settings.register({
        id: "upload",
        title: "WebDAV 资源上传",
        target: "upload",
        component: SettingsView,
      });
      context.settings.register({
        id: "sync",
        title: "WebDAV 同步存储",
        target: "sync",
        component: SettingsView,
      });
    },
  }),
});
