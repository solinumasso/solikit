import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = await kv.hgetall<Record<string, number>>("daily_stats") ?? {};

  const stats = Object.entries(raw)
    .map(([date, count]) => ({ date, count: Number(count) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return res.status(200).json(stats);
}
