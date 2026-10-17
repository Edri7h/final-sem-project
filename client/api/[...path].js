const backendUrl = (process.env.BACKEND_URL || "https://final-sem-project-mzm4.onrender.com").replace(/\/+$/, "");

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const incoming = new URL(req.url || "/api", `https://${req.headers.host || "localhost"}`);

  if (!incoming.pathname.startsWith("/api/")) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string" && !hopByHopHeaders.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  }

  // The API uses an HTTP-only session cookie. Forward it to Render and let
  // the browser receive the Set-Cookie response on its own Vercel origin.
  headers.delete("host");
  headers.delete("accept-encoding");
  // Render only accepts state-changing requests from the canonical app URL.
  // The proxy has a fixed backend destination, so pin this forwarded origin.
  headers.set("origin", "https://final-sem-project-chi.vercel.app");

  const options = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) options.body = Buffer.concat(chunks);
  }

  try {
    const upstream = await fetch(`${backendUrl}${incoming.pathname}${incoming.search}`, options);
    res.statusCode = upstream.status;

    for (const [name, value] of upstream.headers) {
      if (
        !hopByHopHeaders.has(name.toLowerCase()) &&
        !["set-cookie", "content-encoding"].includes(name.toLowerCase())
      ) {
        res.setHeader(name, value);
      }
    }
    const cookies = upstream.headers.getSetCookie?.() || [];
    if (cookies.length) res.setHeader("Set-Cookie", cookies);

    const body = Buffer.from(await upstream.arrayBuffer());
    res.end(body);
  } catch (error) {
    console.error("API proxy failed:", error);
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "The API server is temporarily unavailable" }));
  }
}
