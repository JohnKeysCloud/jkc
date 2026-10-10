import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInstagramApi, GRAPH_ORIGIN } from "./api.ts";
import { InstagramApiError } from "./errors.ts";
import { imagePost } from "./testing.ts";

const TOKEN = "IGAA-secret-token";
const noSleep = async () => {};

function fetchSequence(...responses: (Response | Error)[]) {
  const urls: URL[] = [];
  const fetchImpl = (async (input: URL) => {
    urls.push(new URL(input));
    const next = responses.shift();
    if (!next || next instanceof Error) {
      throw next ?? new Error("Unexpected request");
    }
    return next;
  }) as typeof fetch;
  return { fetchImpl, urls };
}

async function collect(api: ReturnType<typeof createInstagramApi>) {
  const pages = [];
  for await (const page of api.listMedia()) {
    pages.push(page);
  }
  return pages;
}

describe("listMedia", () => {
  it("follows pagination until there is no next page", async () => {
    const { fetchImpl, urls } = fetchSequence(
      Response.json({
        data: [imagePost("1", "2025-01-02T00:00:00+0000")],
        paging: {
          next: `${GRAPH_ORIGIN}/me/media?after=abc&access_token=${TOKEN}`,
        },
      }),
      Response.json({ data: [imagePost("2", "2025-01-01T00:00:00+0000")] }),
    );
    const pages = await collect(
      createInstagramApi({ accessToken: TOKEN, fetchImpl, sleep: noSleep }),
    );

    assert.deepEqual(
      pages.map((page) => page.map((media) => media.id)),
      [["1"], ["2"]],
    );
    assert.equal(urls[0].searchParams.get("access_token"), TOKEN);
    assert.match(urls[0].searchParams.get("fields") ?? "", /children\{/);
    assert.equal(urls[1].searchParams.get("after"), "abc");
  });

  it("refuses to send the token to another host", async () => {
    const { fetchImpl } = fetchSequence(
      Response.json({
        data: [],
        paging: { next: `https://evil.example/me/media?access_token=${TOKEN}` },
      }),
    );
    await assert.rejects(
      collect(createInstagramApi({ accessToken: TOKEN, fetchImpl })),
      /Refusing to follow pagination/,
    );
  });

  it("drops alt_text when the API doesn't offer it", async () => {
    const { fetchImpl, urls } = fetchSequence(
      Response.json(
        {
          error: {
            message: "Tried accessing nonexisting field (alt_text)",
            code: 100,
          },
        },
        { status: 400 },
      ),
      Response.json({ data: [] }),
    );
    await collect(createInstagramApi({ accessToken: TOKEN, fetchImpl }));

    assert.match(urls[0].searchParams.get("fields") ?? "", /alt_text/);
    assert.doesNotMatch(urls[1].searchParams.get("fields") ?? "", /alt_text/);
  });

  it("retries server errors with bounded attempts", async () => {
    const { fetchImpl, urls } = fetchSequence(
      new Response("busy", { status: 503 }),
      new TypeError("socket hang up"),
      Response.json({ data: [] }),
    );
    await collect(
      createInstagramApi({ accessToken: TOKEN, fetchImpl, sleep: noSleep }),
    );
    assert.equal(urls.length, 3);
  });

  it("gives up after three failed attempts", async () => {
    const { fetchImpl, urls } = fetchSequence(
      new Response("", { status: 500 }),
      new Response("", { status: 500 }),
      new Response("", { status: 500 }),
    );
    await assert.rejects(
      collect(
        createInstagramApi({ accessToken: TOKEN, fetchImpl, sleep: noSleep }),
      ),
    );
    assert.equal(urls.length, 3);
  });

  it("fails fast on auth errors and keeps the token out of the message", async () => {
    const { fetchImpl, urls } = fetchSequence(
      Response.json(
        {
          error: {
            message: `Invalid OAuth access token: access_token=${TOKEN}`,
            code: 190,
          },
        },
        { status: 400 },
      ),
    );
    await assert.rejects(
      collect(createInstagramApi({ accessToken: TOKEN, fetchImpl })),
      (error: unknown) => {
        assert.ok(error instanceof InstagramApiError);
        assert.equal(error.code, 190);
        assert.ok(!error.message.includes(TOKEN));
        return true;
      },
    );
    assert.equal(urls.length, 1);
  });
});

describe("refreshToken", () => {
  it("returns the refreshed token and its lifetime", async () => {
    const { fetchImpl, urls } = fetchSequence(
      Response.json({ access_token: "IGAA-new", expires_in: 5_184_000 }),
    );
    const refreshed = await createInstagramApi({
      accessToken: TOKEN,
      fetchImpl,
    }).refreshToken();

    assert.deepEqual(refreshed, {
      accessToken: "IGAA-new",
      expiresIn: 5_184_000,
    });
    assert.equal(urls[0].pathname, "/refresh_access_token");
    assert.equal(urls[0].searchParams.get("grant_type"), "ig_refresh_token");
  });
});
