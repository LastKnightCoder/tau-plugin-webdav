import { expect, it, vi } from "vitest";
import { uploadWebDav } from "./upload";

it("创建目录后上传原始字节，返回可引用的编码地址并传递取消信号", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 405 }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  const signal = new AbortController().signal;
  const bytes = new Uint8Array([0, 255, 3]);
  const result = await uploadWebDav(
    fetch,
    { name: "图片.png", mimeType: "image/png", content: bytes },
    {
      url: "https://example.com/dav",
      username: "fixture",
      password: "fixture",
      pathPrefix: "附件",
      publicBaseUrl: "https://cdn.example.com",
    },
    signal
  );
  expect(result).toBe("https://cdn.example.com/%E9%99%84%E4%BB%B6/%E5%9B%BE%E7%89%87.png");
  expect(fetch.mock.calls.map(call => call[1].method)).toEqual(["MKCOL", "PUT"]);
  expect(fetch.mock.calls[1][1].signal).toBe(signal);
  expect(new Uint8Array(await fetch.mock.calls[1][1].body.arrayBuffer())).toEqual(bytes);
});
it("认证失败不会继续上传，也不会返回地址", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
  await expect(
    uploadWebDav(
      fetch,
      { name: "file", mimeType: "text/plain", content: new Uint8Array([1]) },
      { url: "https://example.com", username: "fixture", password: "fixture", pathPrefix: "files" },
      new AbortController().signal
    )
  ).rejects.toThrow("403");
  expect(fetch).toHaveBeenCalledTimes(1);
});
