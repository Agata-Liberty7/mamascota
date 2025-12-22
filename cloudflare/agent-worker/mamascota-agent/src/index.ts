export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // только POST /agent
    if (url.pathname !== "/agent") {
      return new Response("Not Found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    const conversationId =
      typeof body?.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim()
        : `conv-${Date.now()}`;

    // ВАЖНО: reply строго string
    const reply =
      message.length > 0
        ? `ACK: ${message}`
        : "ACK: empty message";

    return Response.json({
      ok: true,
      reply,
      conversationId,
    });
  },
};
