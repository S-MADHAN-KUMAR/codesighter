const NV_BASE = 'https://integrate.api.nvidia.com/v1';
const NV_KEY = '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';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${NV_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NV_KEY}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
