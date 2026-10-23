import type { PluginSettingsProps } from "@tau/plugins";
import { ConfigurationPanel, type ConfigurationField } from "@tau/ui";

const accountFields: readonly ConfigurationField[] = [
  {
    key: "url",
    label: "服务器地址",
    placeholder: "https://example.com/dav",
  },
  {
    key: "username",
    label: "用户名",
  },
  {
    key: "password",
    label: "密码",
    type: "password",
  },
];
const fields: readonly ConfigurationField[] = [
  {
    key: "pathPrefix",
    label: "目录",
    placeholder: "sync（可选）",
  },
];

export function MobileSettings(props: PluginSettingsProps) {
  const config = props.syncConfig ?? props.uploadConfig;
  if (!config) return <p>请从客户端对应的服务设置进入。</p>;
  const initialValue: Record<string, string> = { urlStyle: "path" };
  if (config.value && typeof config.value === "object" && !Array.isArray(config.value))
    for (const [key, value] of Object.entries(config.value))
      if (typeof value === "string") initialValue[key] = value;
  const preview = (() => {
    try {
      const key = [initialValue.pathPrefix?.replace(/^\/+|\/+$/g, ""), "photo_example.webp"]
        .filter(Boolean)
        .join("/")
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      if (!props.uploadConfig || !initialValue.url) return "";
      return `${(initialValue.publicBaseUrl || initialValue.url).replace(/\/+$/, "")}/${key}`;
    } catch {
      return "";
    }
  })();
  return (
    <>
      <ConfigurationPanel
        initialValue={initialValue}
        accountFields={accountFields}
        fields={
          props.uploadConfig
            ? [
                ...fields,
                {
                  key: "publicBaseUrl",
                  label: "公开地址前缀",
                  placeholder: "可选，自定义公开域名",
                },
              ]
            : fields
        }
        onSave={value =>
          config.save({
            ...(config.value && typeof config.value === "object" && !Array.isArray(config.value)
              ? config.value
              : {}),
            ...value,
          })
        }
      />
      {preview && (
        <div className="mt-4 space-y-2 px-4">
          <p className="text-ink-3 text-tau-meta">图片地址示例</p>
          <p className="text-ink-2 text-tau-meta break-all">{preview}</p>
        </div>
      )}
    </>
  );
}
