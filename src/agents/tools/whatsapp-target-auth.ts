import type { ClawdbotConfig } from "../../config/config.js";
import { jidToE164, normalizeE164 } from "../../utils.js";
import { resolveWhatsAppAccount } from "../../web/accounts.js";

/**
 * Checks if an outbound WhatsApp target JID is authorized by the allowFrom config.
 * Prevents authenticated callers from targeting non-allowlisted chats by forging chatJid.
 */
export function checkWhatsAppTargetAuth(params: {
  chatJid: string;
  cfg: ClawdbotConfig;
  accountId?: string;
}): { ok: boolean; reason?: string } {
  const account = resolveWhatsAppAccount({
    cfg: params.cfg,
    accountId: params.accountId ?? null,
  });
  const allowFrom = account.allowFrom ?? params.cfg.channels?.whatsapp?.allowFrom;

  // No allowlist configured — outbound is unrestricted.
  if (!Array.isArray(allowFrom) || allowFrom.length === 0) {
    return { ok: true };
  }
  // Wildcard allows all.
  if (allowFrom.includes("*")) {
    return { ok: true };
  }

  // Group JIDs are not matched against allowFrom (they use group policy separately).
  if (params.chatJid.endsWith("@g.us")) {
    return { ok: true };
  }

  const e164 = jidToE164(params.chatJid);
  if (!e164) {
    return { ok: false, reason: "WhatsApp target JID not authorized: unrecognized JID format" };
  }

  const normalizedTarget = normalizeE164(e164);
  const allowed = allowFrom.some((entry) => {
    try {
      return normalizeE164(String(entry)) === normalizedTarget;
    } catch {
      return false;
    }
  });

  if (!allowed) {
    return { ok: false, reason: "WhatsApp target JID not authorized by allowlist" };
  }
  return { ok: true };
}
