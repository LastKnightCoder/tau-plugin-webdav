import { createClient, getPatcher, type WebDAVClient } from "webdav";
import type {
  JsonValue,
  RemoteFileInfo,
  SyncProvider,
} from "@tau/plugins/sync";

interface Config {
  url: string;
  username: string;
  password: string;
  pathPrefix: string;
}

// SDK随插件独立打包，此扩展只作用于本插件的客户端实例。
export function bindWebDavTransport(fetch: typeof globalThis.fetch) {
  const patcher = getPatcher();
  let activeFetch: typeof fetch | undefined = fetch;
  patcher.patch("fetch", (input, init) => {
    if (!activeFetch) throw new Error("WebDAV插件已停用");
    return activeFetch(input as RequestInfo, init as RequestInit);
  });
  return {
    dispose: () => {
      activeFetch = undefined;
    },
  };
}

function parse(value: JsonValue): Config {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("WebDAV配置无效");
  const text = (key: string) => {
    const field = value[key];
    if (typeof field !== "string" || !field)
      throw new Error("请填写WebDAV地址、用户名和密码");
    return field;
  };
  return {
    url: text("url"),
    username: text("username"),
    password: text("password"),
    pathPrefix: typeof value.pathPrefix === "string" ? value.pathPrefix : "",
  };
}

class WebDavSyncProvider implements SyncProvider {
  private readonly client: WebDAVClient;
  private readonly prefix: string;

  constructor(config: Config) {
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
    this.prefix = config.pathPrefix.replace(/^\/+|\/+$/g, "");
  }

  private path(name: string) {
    return (
      "/" +
      [this.prefix, name.replace(/^\/+/, "")]
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/")
    );
  }

  private async put(name: string, content: Uint8Array, createOnly: boolean) {
    const remotePath = this.path(name);
    const directory = remotePath.split("/").slice(0, -1).join("/") || "/";
    if (directory !== "/") {
      try {
        await this.client.createDirectory(directory, { recursive: true });
      } catch {
        // 保留原上传行为：目录创建失败后仍由PUT确认是否可写。
      }
    }
    return this.client.putFileContents(
      remotePath,
      new Uint8Array(content).buffer,
      {
        contentLength: content.byteLength,
        overwrite: !createOnly,
        ...(createOnly ? { headers: { "If-None-Match": "*" } } : {}),
      },
    );
  }

  async uploadFile(name: string, content: Uint8Array) {
    try {
      return await this.put(name, content, false);
    } catch {
      return false;
    }
  }

  async createFileIfAbsent(name: string, content: Uint8Array) {
    try {
      return await this.put(name, content, true);
    } catch {
      return false;
    }
  }

  async downloadFile(name: string): Promise<Uint8Array> {
    const content = await this.client.getFileContents(this.path(name));
    if (content instanceof ArrayBuffer) return new Uint8Array(content);
    if (ArrayBuffer.isView(content))
      return new Uint8Array(
        content.buffer,
        content.byteOffset,
        content.byteLength,
      );
    if (typeof content === "string") return new TextEncoder().encode(content);
    throw new Error("WebDAV返回了不支持的文件内容");
  }

  fileExists(name: string) {
    return this.client.exists(this.path(name));
  }

  async listFiles(prefix = ""): Promise<RemoteFileInfo[]> {
    const queue = [this.path(prefix)];
    const visited = new Set<string>();
    const files: RemoteFileInfo[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      try {
        const contents = await this.client.getDirectoryContents(current);
        for (const item of contents) {
          if (item.type === "directory") {
            queue.push(item.filename);
          } else if (item.type === "file") {
            const fullPath = item.filename.replace(/^\/+/, "");
            const relativePath =
              this.prefix && fullPath.startsWith(this.prefix + "/")
                ? fullPath.slice(this.prefix.length + 1)
                : fullPath;
            files.push({
              name: relativePath.split("/").pop() || item.basename,
              path: relativePath,
              size: Number(item.size || 0),
              lastModified: item.lastmod
                ? new Date(item.lastmod).getTime()
                : undefined,
            });
          }
        }
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 404
        )
          continue;
        throw error;
      }
    }
    return files;
  }
}

export function createWebDavSyncProvider(config: JsonValue): SyncProvider {
  return new WebDavSyncProvider(parse(config));
}
