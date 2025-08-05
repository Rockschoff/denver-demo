/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SnowflakeResult<Row = any> {
  data: Row[];
}

export async function executeSnowflakeQuery<Row = any>(
  query: string
): Promise<SnowflakeResult<Row>> {
  const res = await fetch('/api/query-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  // parse JSON body
  const payload = await res.json();

  if (!res.ok) {
    // you can inspect payload.error or payload.message here
    throw new Error(payload.error ?? `Request failed with status ${res.status}`);
  }

  return payload as SnowflakeResult<Row>;
}