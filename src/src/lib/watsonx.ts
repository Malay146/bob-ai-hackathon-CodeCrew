// Thin, optional wrapper around IBM watsonx.ai text generation. Every caller
// treats a null return as "not configured" and falls back to templated text
// — the app must work fully with plain statistics alone (see lib/analysis),
// watsonx only makes the narration nicer when credentials are present.

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getIamToken(apiKey: string): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  try {
    const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.value;
  } catch {
    return null;
  }
}

export async function generateNarrative(prompt: string): Promise<string | null> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const baseUrl = process.env.WATSONX_URL ?? "https://us-south.ml.cloud.ibm.com";
  if (!apiKey || !projectId) return null;

  const token = await getIamToken(apiKey);
  if (!token) return null;

  try {
    const res = await fetch(`${baseUrl}/ml/v1/text/generation?version=2023-05-29`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model_id: "ibm/granite-3-8b-instruct",
        project_id: projectId,
        input: prompt,
        parameters: { max_new_tokens: 350, temperature: 0.3 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { generated_text?: string }[] };
    return data.results?.[0]?.generated_text?.trim() ?? null;
  } catch {
    return null;
  }
}
