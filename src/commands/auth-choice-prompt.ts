import type { AuthProfileStore } from "../agents/auth-profiles.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { buildAuthChoiceGroups } from "./auth-choice-options.js";
import type { AuthChoice } from "./onboard-types.js";

const BACK_VALUE = "__back";

export async function promptAuthChoiceGrouped(params: {
  prompter: WizardPrompter;
  store: AuthProfileStore;
  includeSkip: boolean;
  includeClaudeCliIfMissing?: boolean;
  platform?: NodeJS.Platform;
}): Promise<AuthChoice> {
  const { groups, skipOption } = buildAuthChoiceGroups(params);
  const availableGroups = groups.filter((group) => group.options.length > 0);

  while (true) {
    const providerOptions = [
      ...availableGroups.map((group) => ({
        value: group.value,
        label: group.label,
        hint: group.hint,
      })),
      ...(skipOption ? [skipOption] : []),
    ];

    const providerSelection = (await params.prompter.select({
      message: "模型/认证提供商",
      options: providerOptions,
    })) as string;

    if (providerSelection === "skip") {
      return "skip";
    }

    const group = availableGroups.find((candidate) => candidate.value === providerSelection);

    if (!group || group.options.length === 0) {
      await params.prompter.note("该提供商没有可用的认证方法。", "模型/认证选择");
      continue;
    }

    const methodSelection = (await params.prompter.select({
      message: `${group.label} 认证方法`,
      options: [...group.options, { value: BACK_VALUE, label: "返回" }],
    })) as string;

    if (methodSelection === BACK_VALUE) {
      continue;
    }

    return methodSelection as AuthChoice;
  }
}
