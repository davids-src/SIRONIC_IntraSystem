export interface MockResponseSpec {
  status: number;
  json?: unknown;
  headers?: Record<string, string>;
}

/** Installs a sequenced global.fetch mock; each call consumes the next spec (last spec repeats). */
export function mockFetchSequence(specs: MockResponseSpec[]): jest.Mock {
  let call = 0;
  const fn = jest.fn(async () => {
    const spec = specs[Math.min(call, specs.length - 1)] as MockResponseSpec;
    call += 1;
    const noBody = spec.status === 204 || spec.status === 205 || spec.status === 304;
    const body = noBody || spec.json === undefined ? null : JSON.stringify(spec.json);
    return new Response(body, {
      status: spec.status,
      headers: spec.headers,
    });
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fn;
  return fn;
}
