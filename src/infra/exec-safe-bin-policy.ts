/**
 * Safe-bin policy module — canonical re-export of allowlist and analysis safe-bin utilities.
 * Import from here rather than reaching into exec-approvals-allowlist or exec-approvals-analysis
 * directly to maintain a stable boundary for safe-bin policy decisions.
 */
export {
  normalizeSafeBins,
  resolveSafeBins,
  isSafeBinUsage,
  evaluateExecAllowlist,
  evaluateShellAllowlist,
  type ExecAllowlistEvaluation,
  type ExecAllowlistAnalysis,
  type ExecSegmentSatisfiedBy,
} from "./exec-approvals-allowlist.js";
export {
  DEFAULT_SAFE_BINS,
  analyzeArgvCommand,
  buildSafeBinsShellCommand,
} from "./exec-approvals.js";
