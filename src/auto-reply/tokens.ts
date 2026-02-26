export const HEARTBEAT_TOKEN = "HEARTBEAT_OK";
export const SILENT_REPLY_TOKEN = "NO_REPLY";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isSilentReplyText(
  text: string | undefined,
  token: string = SILENT_REPLY_TOKEN,
): boolean {
  if (!text) return false;
  const escaped = escapeRegExp(token);
  const prefix = new RegExp(`^\\s*${escaped}(?=$|\\W)`);
  if (prefix.test(text)) return true;
  const suffix = new RegExp(`\\b${escaped}\\b\\W*$`);
  if (suffix.test(text)) return true;

  // Enhance detection for partial trailing tokens during streaming or malformed generation
  if (token === "NO_REPLY" && /^\s*(NO|NO_|NO_R|NO_RE|NO_REP|NO_REPL)(\s|$)/i.test(text)) {
    return true;
  }

  return false;
}
