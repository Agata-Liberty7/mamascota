import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Mamascota Agent Worker", () => {
  it("responds to /health", async () => {
    const request = new IncomingRequest("https://example.com/health");
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    const body = await response.json<{
      ok: boolean;
      status: string;
      hasApiKey: boolean;
    }>();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("up");
    expect(typeof body.hasApiKey).toBe("boolean");
  });

  it("responds to /agent ping", async () => {
    const response = await SELF.fetch("https://example.com/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "ping",
        conversationId: "test-ping",
      }),
    });

    const body = await response.json<{
      ok: boolean;
      pong: boolean;
      conversationId: string;
    }>();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pong).toBe(true);
    expect(body.conversationId).toBe("test-ping");
  });

  it("returns 404 for an unknown route", async () => {
    const response = await SELF.fetch("https://example.com/unknown");
    const body = await response.json<{
      ok: boolean;
      error: string;
    }>();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: "Not found",
    });
  });
});
