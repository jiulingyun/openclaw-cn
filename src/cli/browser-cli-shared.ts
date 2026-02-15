export type BrowserParentOpts = {
  url?: string;
  json?: boolean;
  browserProfile?: string;
};

export async function callBrowserRequest(
  url: string,
  _opts?: { method?: string; body?: unknown; timeout?: number },
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(url, {
    method: _opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: _opts?.body ? JSON.stringify(_opts.body) : undefined,
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}
