import { createElement } from "react";
import { renderAsync } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { template } from "@/lib/email-templates/kenteken-aanvraag";
import { sendViaSmtp, smtpConfigured } from "@/lib/smtp.server";

const NOTIFY = ["nick@reclamefabriek.nl", "autoservice@rickvandiepen.nl"] as const;

const schema = z.object({
  plate: z.string().min(2).max(16),
  car: z.string().max(120).optional().default(""),
  bouwjaar: z.string().max(20).optional().default(""),
  kleur: z.string().max(40).optional().default(""),
  brandstof: z.string().max(40).optional().default(""),
  apkTot: z.string().max(40).optional().default(""),
  service: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(30),
  note: z.string().max(1000).optional().default(""),
});

// Simple in-memory throttle per IP (best effort, resets on cold start).
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });

export const Route = createFileRoute("/api/public/kenteken-aanvraag")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (rateLimited(ip)) {
          return json({ error: "Te veel aanvragen. Probeer het later opnieuw." }, 429);
        }

        let parsed;
        try {
          parsed = schema.parse(await request.json());
        } catch {
          return json({ error: "Ongeldige aanvraag." }, 400);
        }

        const id = crypto.randomUUID();
        const useSmtp = smtpConfigured();
        const html = useSmtp
          ? await renderAsync(createElement(template.component, parsed))
          : "";
        const subject = template.subject(parsed);

        const results = await Promise.allSettled(
          NOTIFY.map((to) =>
            useSmtp
              ? sendViaSmtp({ to, subject, html })
              : sendTemplateEmail("kenteken-aanvraag", to, {
                  templateData: parsed,
                  idempotencyKey: `kenteken-aanvraag-${id}-${to}`,
                }),
          ),
        );

        const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        for (const f of failed) {
          console.error("Kenteken aanvraag mail mislukt:", f.reason);
        }
        // Domain not yet verified / emails disabled: server-side state, not a
        // visitor problem — accept the request instead of showing an error.
        const pendingDomain = failed.some((f) => {
          const code = (f.reason as { code?: string })?.code;
          return code === "domain_not_verified" || code === "emails_disabled";
        });
        if (failed.length === results.length && !pendingDomain) {
          return json({ error: "Versturen mislukt." }, 502);
        }


        return json({ ok: true });
      },
    },
  },
});
