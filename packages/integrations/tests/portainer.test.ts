import { PortainerClient } from "../src/portainer/client";
import { mockFetchSequence } from "./test-utils";

const client = new PortainerClient({
  baseUrl: "https://portainer.test",
  apiKey: "key",
  endpointId: 1,
});

describe("PortainerClient", () => {
  it("createStackStandalone returns id and webhook id", async () => {
    mockFetchSequence([
      {
        status: 200,
        json: { Id: 7, Name: "partner-example", AutoUpdate: { Webhook: "wh-uuid" } },
      },
    ]);
    const result = await client.createStackStandalone(
      "partner-example",
      "services:\n  app: {}\n",
      [{ name: "IMAGE_TAG", value: "abc123" }],
    );
    expect(result).toEqual({ id: 7, webhookId: "wh-uuid" });
  });

  it("listStacks parses an array of stacks", async () => {
    mockFetchSequence([
      {
        status: 200,
        json: [
          { Id: 1, Name: "a" },
          { Id: 2, Name: "b" },
        ],
      },
    ]);
    const stacks = await client.listStacks();
    expect(stacks).toHaveLength(2);
  });

  it("triggerWebhook posts without retry", async () => {
    const fetchMock = mockFetchSequence([{ status: 200 }]);
    await client.triggerWebhook("wh-uuid");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
