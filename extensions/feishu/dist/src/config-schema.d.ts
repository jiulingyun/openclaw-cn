import { z } from "zod";
export declare const FeishuConfigSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    appId: z.ZodOptional<z.ZodString>;
    appSecret: z.ZodOptional<z.ZodString>;
    appSecretFile: z.ZodOptional<z.ZodString>;
    encryptKey: z.ZodOptional<z.ZodString>;
    verificationToken: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
    botName: z.ZodOptional<z.ZodString>;
    markdown: z.ZodOptional<z.ZodObject<{
        tables: z.ZodOptional<z.ZodEnum<{
            off: "off";
            bullets: "bullets";
            code: "code";
        }>>;
    }, z.core.$strict>>;
    dmPolicy: z.ZodOptional<z.ZodEnum<{
        disabled: "disabled";
        pairing: "pairing";
        allowlist: "allowlist";
        open: "open";
    }>>;
    groupPolicy: z.ZodOptional<z.ZodEnum<{
        disabled: "disabled";
        allowlist: "allowlist";
        open: "open";
    }>>;
    allowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    groupAllowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    historyLimit: z.ZodOptional<z.ZodNumber>;
    dmHistoryLimit: z.ZodOptional<z.ZodNumber>;
    textChunkLimit: z.ZodOptional<z.ZodNumber>;
    chunkMode: z.ZodOptional<z.ZodEnum<{
        length: "length";
        newline: "newline";
    }>>;
    blockStreaming: z.ZodOptional<z.ZodBoolean>;
    streaming: z.ZodOptional<z.ZodBoolean>;
    mediaMaxMb: z.ZodOptional<z.ZodNumber>;
    responsePrefix: z.ZodOptional<z.ZodString>;
    connectionMode: z.ZodOptional<z.ZodEnum<{
        websocket: "websocket";
        webhook: "webhook";
    }>>;
    webhookPort: z.ZodOptional<z.ZodNumber>;
    webhookPath: z.ZodOptional<z.ZodString>;
    topicSessionMode: z.ZodOptional<z.ZodEnum<{
        enabled: "enabled";
        disabled: "disabled";
        always: "always";
        mentioned: "mentioned";
    }>>;
    renderMode: z.ZodOptional<z.ZodEnum<{
        auto: "auto";
        text: "text";
        card: "card";
        raw: "raw";
    }>>;
    requireMention: z.ZodOptional<z.ZodBoolean>;
    tools: z.ZodOptional<z.ZodAny>;
    dms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    dynamicAgentCreation: z.ZodOptional<z.ZodAny>;
    groups: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        requireMention: z.ZodOptional<z.ZodBoolean>;
        allowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        tools: z.ZodOptional<z.ZodObject<{
            allow: z.ZodOptional<z.ZodArray<z.ZodString>>;
            alsoAllow: z.ZodOptional<z.ZodArray<z.ZodString>>;
            deny: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>;
        toolsBySender: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodObject<{
            allow: z.ZodOptional<z.ZodArray<z.ZodString>>;
            alsoAllow: z.ZodOptional<z.ZodArray<z.ZodString>>;
            deny: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>>>;
        systemPrompt: z.ZodOptional<z.ZodString>;
        skills: z.ZodOptional<z.ZodArray<z.ZodString>>;
        topicSessionMode: z.ZodOptional<z.ZodEnum<{
            enabled: "enabled";
            disabled: "disabled";
            always: "always";
            mentioned: "mentioned";
        }>>;
    }, z.core.$strict>>>>;
    accounts: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        enabled: z.ZodOptional<z.ZodBoolean>;
        appId: z.ZodOptional<z.ZodString>;
        appSecret: z.ZodOptional<z.ZodString>;
        appSecretFile: z.ZodOptional<z.ZodString>;
        encryptKey: z.ZodOptional<z.ZodString>;
        verificationToken: z.ZodOptional<z.ZodString>;
        domain: z.ZodOptional<z.ZodString>;
        botName: z.ZodOptional<z.ZodString>;
        markdown: z.ZodOptional<z.ZodObject<{
            tables: z.ZodOptional<z.ZodEnum<{
                off: "off";
                bullets: "bullets";
                code: "code";
            }>>;
        }, z.core.$strict>>;
        dmPolicy: z.ZodOptional<z.ZodEnum<{
            disabled: "disabled";
            pairing: "pairing";
            allowlist: "allowlist";
            open: "open";
        }>>;
        groupPolicy: z.ZodOptional<z.ZodEnum<{
            disabled: "disabled";
            allowlist: "allowlist";
            open: "open";
        }>>;
        allowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        groupAllowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        historyLimit: z.ZodOptional<z.ZodNumber>;
        dmHistoryLimit: z.ZodOptional<z.ZodNumber>;
        textChunkLimit: z.ZodOptional<z.ZodNumber>;
        chunkMode: z.ZodOptional<z.ZodEnum<{
            length: "length";
            newline: "newline";
        }>>;
        blockStreaming: z.ZodOptional<z.ZodBoolean>;
        streaming: z.ZodOptional<z.ZodBoolean>;
        mediaMaxMb: z.ZodOptional<z.ZodNumber>;
        responsePrefix: z.ZodOptional<z.ZodString>;
        connectionMode: z.ZodOptional<z.ZodEnum<{
            websocket: "websocket";
            webhook: "webhook";
        }>>;
        webhookPort: z.ZodOptional<z.ZodNumber>;
        webhookPath: z.ZodOptional<z.ZodString>;
        topicSessionMode: z.ZodOptional<z.ZodEnum<{
            enabled: "enabled";
            disabled: "disabled";
            always: "always";
            mentioned: "mentioned";
        }>>;
        renderMode: z.ZodOptional<z.ZodEnum<{
            auto: "auto";
            text: "text";
            card: "card";
            raw: "raw";
        }>>;
        requireMention: z.ZodOptional<z.ZodBoolean>;
        tools: z.ZodOptional<z.ZodAny>;
        dms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        dynamicAgentCreation: z.ZodOptional<z.ZodAny>;
        groups: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            requireMention: z.ZodOptional<z.ZodBoolean>;
            allowFrom: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
            tools: z.ZodOptional<z.ZodObject<{
                allow: z.ZodOptional<z.ZodArray<z.ZodString>>;
                alsoAllow: z.ZodOptional<z.ZodArray<z.ZodString>>;
                deny: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            toolsBySender: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodObject<{
                allow: z.ZodOptional<z.ZodArray<z.ZodString>>;
                alsoAllow: z.ZodOptional<z.ZodArray<z.ZodString>>;
                deny: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>>>;
            systemPrompt: z.ZodOptional<z.ZodString>;
            skills: z.ZodOptional<z.ZodArray<z.ZodString>>;
            topicSessionMode: z.ZodOptional<z.ZodEnum<{
                enabled: "enabled";
                disabled: "disabled";
                always: "always";
                mentioned: "mentioned";
            }>>;
        }, z.core.$strict>>>>;
    }, z.core.$strict>>>>;
}, z.core.$strict>;
//# sourceMappingURL=config-schema.d.ts.map