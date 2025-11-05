import { MarkdownArticle } from "./newsletter/dailyReport";

/**
 * 向 Planet 后端创建文章（不包含附件上传）。
 * 会从环境变量读取：
 * - PLANET_BASE_URL: 如 http://localhost:8086
 * - PLANET_AUTH_BASIC: Basic <base64(user:pass)>
 */
export async function post2planet(env: Env, article: MarkdownArticle): Promise<string> {
  const baseUrl = env.PLANET_BASE_URL;
  const auth = env.PLANET_AUTH_BASIC;
  const planetId = env.PLANET_ID;

  if (!baseUrl) throw new Error("Missing env.PLANET_BASE_URL");
  if (!auth) throw new Error("Missing env.PLANET_AUTH_BASIC");
  if (!planetId) throw new Error("Missing env.PLANET_ID");

  const url = `${baseUrl.replace(/\/$/, "")}/v0/planets/my/${planetId}/articles`;

  const form = new FormData();
  form.append("title", article.title);
  form.append("content", article.content);
  form.append("articleType", "0");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      accept: "*/*",
      authorization: auth,
    },
    body: form,
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`post2planet failed: ${resp.status} ${resp.statusText} - ${text}`);
  }
  return text;
}