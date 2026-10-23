import type { JsonValue, UploadFile } from "@tau/plugins";

export async function uploadWebDav(
  fetch: typeof globalThis.fetch,
  file: UploadFile,
  value: JsonValue,
  signal: AbortSignal
): Promise<string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("WebDAV 配置无效");
  const read = (key: string) => (typeof value[key] === "string" ? value[key] : "");
  const base = new URL(read("url"));
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.search ||
    base.hash ||
    !read("username") ||
    !read("password")
  )
    throw new Error("请填写 WebDAV 地址、用户名和密码");
  const publicBase = read("publicBaseUrl");
  const publicUrl = publicBase ? new URL(publicBase) : undefined;
  if (
    publicUrl &&
    (!["http:", "https:"].includes(publicUrl.protocol) || publicUrl.search || publicUrl.hash)
  )
    throw new Error("公开地址前缀无效");
  const publicRoot = publicUrl?.href.replace(/\/+$/, "");
  const key = [read("pathPrefix").replace(/^\/+|\/+$/g, ""), file.name].filter(Boolean).join("/");
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const root = base.href.replace(/\/+$/, "");
  const credentials = new TextEncoder().encode(`${read("username")}:${read("password")}`);
  const authorization = `Basic ${btoa(Array.from(credentials, byte => String.fromCharCode(byte)).join(""))}`;
  const directories = encoded.split("/").slice(0, -1);
  let directory = root;
  for (const part of directories) {
    directory += "/" + part;
    const response = await fetch(directory, {
      method: "MKCOL",
      headers: { Authorization: authorization },
      signal,
    });
    if (!response.ok && response.status !== 405)
      throw new Error(`WebDAV 创建目录失败：HTTP ${response.status}`);
  }
  const response = await fetch(`${root}/${encoded}`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": file.mimeType || "application/octet-stream",
    },
    body: new Blob([new Uint8Array(file.content)]),
    signal,
  });
  if (!response.ok) throw new Error(`WebDAV 上传失败：HTTP ${response.status}`);
  return `${publicRoot ?? root}/${encoded}`;
}
