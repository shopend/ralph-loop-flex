const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ralph-api`;

function headers(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    "x-ralph-key": apiKey,
  };
}

export async function createRun(prd: object, apiKey?: string): Promise<{ run_id: string; api_key: string; status: string }> {
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ prd, api_key: apiKey }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create run");
  return res.json();
}

export async function getRun(runId: string, apiKey: string) {
  const res = await fetch(`${BASE}/runs/${runId}`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to get run");
  return res.json();
}

export async function updateRunStatus(runId: string, apiKey: string, status: string) {
  const res = await fetch(`${BASE}/runs/${runId}`, {
    method: "PATCH",
    headers: headers(apiKey),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update run");
  return res.json();
}

export async function updateStory(runId: string, apiKey: string, storyId: string, payload: { passes?: boolean; notes?: string }) {
  const res = await fetch(`${BASE}/runs/${runId}/stories/${storyId}`, {
    method: "PATCH",
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update story");
  return res.json();
}

export async function getNextStory(runId: string, apiKey: string) {
  const res = await fetch(`${BASE}/runs/${runId}/next`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to get next story");
  return res.json();
}

export { BASE };
