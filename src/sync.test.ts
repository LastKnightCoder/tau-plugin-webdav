import { createServer, type Server } from "node:http";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { bindWebDavTransport, createWebDavSyncProvider } from "./sync";
import type { SyncProvider } from "@tau/plugins/sync";

let server: Server;
let provider: SyncProvider;
let transport: ReturnType<typeof bindWebDavTransport>;
const fetch = vi.fn(globalThis.fetch);
const objects = new Map<string, Buffer>();
const directories = new Set<string>();
const requests: { method: string; path: string; conditional: boolean }[] = [];
let denied = false;
beforeEach(async () => {
  objects.clear();
  directories.clear();
  directories.add("/dav");
  requests.length = 0;
  denied = false;
  fetch.mockClear();
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url!, "http://localhost").pathname,
    ).replace(/\/$/, "");
    const end = (status: number) => {
      res.statusCode = status;
      res.end();
    };
    requests.push({
      method: req.method!,
      path: pathname,
      conditional: req.headers["if-none-match"] === "*",
    });
    if (
      denied ||
      req.headers.authorization !==
        "Basic " + Buffer.from("user:secret").toString("base64")
    )
      return end(401);
    if (req.method === "MKCOL") {
      directories.add(pathname);
      return end(201);
    }
    if (req.method === "PUT") {
      if (!directories.has(pathname.split("/").slice(0, -1).join("/")))
        return end(409);
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (req.headers["if-none-match"] === "*" && objects.has(pathname))
        return end(412);
      objects.set(pathname, Buffer.concat(chunks));
      return end(201);
    }
    if (req.method === "PROPFIND") {
      if (!objects.has(pathname) && !directories.has(pathname)) return end(404);
      const children =
        req.headers.depth === "0"
          ? []
          : [...directories, ...objects.keys()].filter(
              (key) =>
                key !== pathname &&
                key.split("/").slice(0, -1).join("/") === pathname,
            );
      const xml = [pathname, ...children]
        .map(
          (key) =>
            `<d:response><d:href>${key.split("/").map(encodeURIComponent).join("/")}</d:href><d:propstat><d:prop><d:resourcetype>${directories.has(key) ? "<d:collection/>" : ""}</d:resourcetype><d:getcontentlength>${objects.get(key)?.length ?? 0}</d:getcontentlength><d:getlastmodified>Sun, 18 Oct 2026 00:00:00 GMT</d:getlastmodified></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`,
        )
        .join("");
      res.writeHead(207, { "Content-Type": "application/xml" });
      return res.end(`<d:multistatus xmlns:d="DAV:">${xml}</d:multistatus>`);
    }
    if (!objects.has(pathname)) return end(404);
    res.end(objects.get(pathname));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("测试服务未启动");
  transport = bindWebDavTransport(fetch);
  provider = createWebDavSyncProvider({
    url: `http://127.0.0.1:${address.port}/dav`,
    username: "user",
    password: "secret",
    pathPrefix: "/笔记 folder/",
  });
});
afterEach(async () => {
  transport.dispose();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
it("官方浏览器客户端通过注入fetch创建目录、覆盖写入和读取原始字节", async () => {
  expect(
    await provider.uploadFile("子目录/a b.bin", new Uint8Array([0, 255])),
  ).toBe(true);
  expect(await provider.downloadFile("子目录/a b.bin")).toEqual(
    new Uint8Array([0, 255]),
  );
  expect(await provider.fileExists("子目录/a b.bin")).toBe(true);
  expect(await provider.uploadFile("子目录/a b.bin", new Uint8Array([3]))).toBe(
    true,
  );
  expect(await provider.downloadFile("子目录/a b.bin")).toEqual(
    new Uint8Array([3]),
  );
  expect(fetch).toHaveBeenCalled();
  expect(requests.some((item) => item.method === "MKCOL")).toBe(true);
});
it("412返回false，并发条件创建只有一个成功且不覆盖原内容", async () => {
  const result = await Promise.all(
    [1, 2].map((value) =>
      provider.createFileIfAbsent("commit", new Uint8Array([value])),
    ),
  );
  expect(result.sort()).toEqual([false, true]);
  const before = await provider.downloadFile("commit");
  expect(await provider.createFileIfAbsent("commit", new Uint8Array([9]))).toBe(
    false,
  );
  expect(await provider.downloadFile("commit")).toEqual(before);
  expect(
    requests
      .filter((item) => item.method === "PUT")
      .every((item) => item.conditional),
  ).toBe(true);
});
it("递归列举返回相对路径，缺失目录为空", async () => {
  await provider.uploadFile("a.bin", new Uint8Array([1]));
  await provider.uploadFile("nested/b.bin", new Uint8Array([2, 3]));
  expect(
    (await provider.listFiles()).map((file) => [file.path, file.size]),
  ).toEqual([
    ["a.bin", 1],
    ["nested/b.bin", 2],
  ]);
  expect(await provider.listFiles("missing")).toEqual([]);
  expect(await provider.fileExists("missing")).toBe(false);
});
it("认证失败不变成空列表或不存在，上传失败正确返回false", async () => {
  denied = true;
  await expect(provider.listFiles()).rejects.toMatchObject({ status: 401 });
  await expect(provider.fileExists("data")).rejects.toMatchObject({
    status: 401,
  });
  await expect(provider.downloadFile("data")).rejects.toMatchObject({
    status: 401,
  });
  expect(await provider.uploadFile("data", new Uint8Array([1]))).toBe(false);
});
