import { listChannelPlugins } from "../../channels/plugins/index.js";
import type { ChannelChoice } from "../onboard-types.js";
import type { ChannelOnboardingAdapter } from "./types.js";
import { dingtalkConnectorOnboardingAdapter } from "./dingtalk-connector.js";

// Core onboarding adapters for channels whose official plugins do not provide
// their own onboarding adapter (or may not be loaded at configure time).
const CORE_ONBOARDING_ADAPTERS: ReadonlyMap<ChannelChoice, ChannelOnboardingAdapter> = new Map([
  ["dingtalk-connector", dingtalkConnectorOnboardingAdapter],
]);

const CHANNEL_ONBOARDING_ADAPTERS = () => {
  const pluginAdapters = new Map<ChannelChoice, ChannelOnboardingAdapter>(
    listChannelPlugins()
      .map((plugin) =>
        plugin.onboarding ? ([plugin.id as ChannelChoice, plugin.onboarding] as const) : null,
      )
      .filter((entry): entry is readonly [ChannelChoice, ChannelOnboardingAdapter] =>
        Boolean(entry),
      ),
  );
  // Merge: plugin adapters take precedence over core fallbacks
  const merged = new Map<ChannelChoice, ChannelOnboardingAdapter>(CORE_ONBOARDING_ADAPTERS);
  for (const [id, adapter] of pluginAdapters) {
    merged.set(id, adapter);
  }
  return merged;
};

export function getChannelOnboardingAdapter(
  channel: ChannelChoice,
): ChannelOnboardingAdapter | undefined {
  return CHANNEL_ONBOARDING_ADAPTERS().get(channel);
}

export function listChannelOnboardingAdapters(): ChannelOnboardingAdapter[] {
  return Array.from(CHANNEL_ONBOARDING_ADAPTERS().values());
}

// Legacy aliases (pre-rename).
export const getProviderOnboardingAdapter = getChannelOnboardingAdapter;
export const listProviderOnboardingAdapters = listChannelOnboardingAdapters;
