export default async function handler(req) {
  const upstream = await fetch("https://agent.mamascota.com/agent", {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("Content-Type") || "application/json",
    },
    body: req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer(),
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ||
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  path: "/agent",
};
