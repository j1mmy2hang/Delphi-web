import type { Context } from "@netlify/functions"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))

// system-prompt.md sits at the repo root and is bundled via netlify.toml `included_files`.
// At runtime, included files are placed relative to the function — walk up until found.
const loadSystemPrompt = (): string => {
  const candidates = [
    resolve(here, "system-prompt.md"),
    resolve(here, "../system-prompt.md"),
    resolve(here, "../../system-prompt.md"),
    resolve(here, "../../../system-prompt.md"),
  ]
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf-8")
    } catch {
      // try next
    }
  }
  throw new Error("system-prompt.md not found")
}

const SYSTEM_PROMPT = loadSystemPrompt()

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const apiKey = Netlify.env.get("OPENROUTER_API_KEY")
  if (!apiKey) {
    return new Response("API key not configured", { status: 500 })
  }

  let messages: unknown
  try {
    ({ messages } = await req.json())
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://delphi-web.netlify.app",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.6",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(messages as Array<{ role: string; content: string }>),
      ],
    }),
    signal: req.signal,
  })

  if (!upstream.ok) {
    const error = await upstream.text()
    return new Response(error, { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
