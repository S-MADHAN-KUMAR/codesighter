export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nvBase = (process.env.NV_BASE || '').trim().replace(/^['";]+|['";]+$/g, '');
    const nvKey = (process.env.NV_KEY || '').trim().replace(/^['";]+|['";]+$/g, '');
    const nvModelEnv = (process.env.NV_MODEL || '').trim().replace(/^['";]+|['";]+$/g, '');

    const groqKey = (process.env.GROQ_API_KEY || '').trim().replace(/^['";]+|['";]+$/g, '');
    const groqModelEnv = (process.env.GROQ_MODEL || '').trim().replace(/^['";]+|['";]+$/g, '');

    const useGroq = !!groqKey;

    // Groq is preferred now (user provided key). Fallback to NVIDIA if Groq not configured.
    let baseUrl: string;
    let apiKey: string;
    let fallbacks: string[];
    let goneSet: Set<string>;

    if (useGroq) {
      baseUrl = 'https://api.groq.com/openai/v1';
      apiKey = groqKey;
      const GROQ_FALLBACKS = [
        groqModelEnv || null,
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b',
        'groq/compound',
        'allam-2-7b',
      ].filter(Boolean) as string[];
      fallbacks = [...new Set(GROQ_FALLBACKS)];
      goneSet = new Set(['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-8b', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);
    } else {
      if (!nvBase || !nvKey) {
        return new Response(JSON.stringify({ error: 'Missing NV_BASE or NV_KEY env and no GROQ_API_KEY configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      baseUrl = nvBase;
      apiKey = nvKey;
      const NV_FALLBACKS = [
        nvModelEnv || null,
        'meta/llama-3.3-70b-instruct',
        'meta/llama-3.1-70b-instruct',
        'meta/llama-3.1-405b-instruct',
        'nvidia/llama-3.3-nemotron-super-49b-v1.5',
        'nvidia/llama-3.1-nemotron-70b-instruct',
        'meta/llama-3.2-3b-instruct',
      ].filter(Boolean) as string[];
      fallbacks = [...new Set(NV_FALLBACKS)];
      goneSet = new Set(['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-8b']);
    }

    let requested = typeof body.model === 'string' ? body.model.trim() : '';
    // If client sent NVIDIA-era model but we're on Groq, map to Groq default
    if (useGroq && (!requested || goneSet.has(requested) || requested.startsWith('meta/llama') || requested.startsWith('nvidia/'))) {
      requested = fallbacks[0];
    } else if (!requested || goneSet.has(requested)) {
      requested = fallbacks[0];
    }

    const attempts: string[] = [requested, ...fallbacks.filter((m) => m !== requested)];

    let lastErrorText = '';
    let lastStatus = 500;

    // helper to estimate tokens and truncate system message if ITPM exceeded
    const estimateTokens = (s: string) => Math.ceil(s.length / 4);
    const truncatePayload = (payload: any, factor = 0.6) => {
      if (!payload.messages || !Array.isArray(payload.messages)) return payload;
      const cloned = JSON.parse(JSON.stringify(payload));
      // truncate system message (index 0) and any large user messages
      for (const m of cloned.messages) {
        if (typeof m.content === 'string' && m.content.length > 2000) {
          m.content = m.content.slice(0, Math.floor(m.content.length * factor)) + '\n[truncated for token limit]';
        }
      }
      // also cap total payload chars to ~20000 (~5000 tokens)
      let total = JSON.stringify(cloned).length;
      while (total > 20000 && cloned.messages[0]?.content?.length > 1000) {
        cloned.messages[0].content = cloned.messages[0].content.slice(0, Math.floor(cloned.messages[0].content.length * 0.7)) + '\n[truncated]';
        total = JSON.stringify(cloned).length;
      }
      return cloned;
    };

    for (const model of attempts) {
      let payload: any = { ...body, model };
      // pre-emptively cap payload for Groq ITPM 7000 (~28000 chars, but we aim 20000)
      if (useGroq) {
        let est = estimateTokens(JSON.stringify(payload));
        if (est > 5500) payload = truncatePayload(payload, 0.5);
      }

      // inner retry for 413 ITPM
      let retries = 0;
      while (retries <= 2) {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const headers: Record<string, string> = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Model-Used': model,
          };
          if (model !== requested) headers['X-Model-Fallback'] = `${requested} -> ${model}`;
          headers['X-Provider'] = useGroq ? 'groq' : 'nvidia';
          if (retries > 0) headers['X-Truncated-Retry'] = String(retries);
          return new Response(response.body, { headers });
        }

        lastErrorText = await response.text();
        lastStatus = response.status;

        const is413 = response.status === 413;
        const isRateLimitTokens = lastErrorText.includes('rate_limit_exceeded') || lastErrorText.includes('Request too large') || lastErrorText.includes('ITPM') || lastErrorText.includes('tokens');

        if (is413 && isRateLimitTokens && retries < 2) {
          console.warn(`[chat] ${model} 413 ITPM (${estimateTokens(JSON.stringify(payload))} tokens), truncating and retrying ${retries+1}/2`);
          payload = truncatePayload(payload, retries === 0 ? 0.5 : 0.4);
          retries++;
          continue;
        }

        const shouldRetry = response.status === 410 || response.status === 404;
        const isNotFoundError = lastErrorText.includes('does not exist') || lastErrorText.includes('Gone') || lastErrorText.includes('not found for account') || lastErrorText.includes('Function not found') || lastErrorText.includes('model_not_found');

        if (!shouldRetry && !isNotFoundError && !is413) {
          return new Response(lastErrorText, { status: response.status });
        }
        if (is413 && !isRateLimitTokens) {
          // 413 not token-related, don't retry
          return new Response(lastErrorText, { status: response.status });
        }
        // break inner while to try next model
        break;
      }
      console.warn(`[chat] ${useGroq ? 'groq' : 'nvidia'} model ${model} failed ${lastStatus}, trying next fallback. Detail: ${lastErrorText.slice(0, 300)}`);
    }

    return new Response(
      JSON.stringify({
        error: `All models failed. Last error ${lastStatus}: ${lastErrorText.slice(0, 800)}`,
        attempts,
        provider: useGroq ? 'groq' : 'nvidia',
        hint: useGroq
          ? 'Check GROQ_MODEL in .env and that your Groq API key has access (try qwen/qwen3.8-27b or openai/gpt-oss-20b). Get key at https://console.groq.com/keys'
          : 'Set NV_MODEL in .env to a model enabled for your NVIDIA account (check GET /v1/models). Or set GROQ_API_KEY to use Groq.',
      }),
      { status: lastStatus === 410 ? 410 : 502, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
