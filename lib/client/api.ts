// Browser-side helpers for calling the JSON API routes. Errors from the server
// are already user-safe; network failures get a generic friendly message.

export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? "The request failed. Please try again." };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error — check your connection and try again." };
  }
}
