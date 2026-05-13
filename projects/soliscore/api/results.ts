import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Paramètre email manquant." });
  }

  const saved = await kv.get<{ scores: unknown[]; savedAt: string; count: number }>(`results:${email}`);
  if (!saved) return res.status(404).json({ error: "Aucune analyse sauvegardée." });

  return res.status(200).json(saved);
}
