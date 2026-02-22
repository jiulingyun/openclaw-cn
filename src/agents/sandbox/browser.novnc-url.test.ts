import { describe, expect, it } from "vitest";
import {
  buildNoVncDirectUrl,
  buildNoVncObserverTokenUrl,
  consumeNoVncObserverToken,
  issueNoVncObserverToken,
  resetNoVncObserverTokensForTests,
} from "./novnc-auth.js";

describe("noVNC 认证辅助函数", () => {
  it("不含密码时生成默认观察者 URL", () => {
    expect(buildNoVncDirectUrl(45678)).toBe(
      "http://127.0.0.1:45678/vnc.html?autoconnect=1&resize=remote",
    );
  });

  it("提供密码时添加编码后的密码查询参数", () => {
    expect(buildNoVncDirectUrl(45678, "a+b c&d")).toBe(
      "http://127.0.0.1:45678/vnc.html?autoconnect=1&resize=remote&password=a%2Bb+c%26d",
    );
  });

  it("颁发一次性短期观察者令牌", () => {
    resetNoVncObserverTokensForTests();
    const token = issueNoVncObserverToken({
      url: "http://127.0.0.1:50123/vnc.html?autoconnect=1&resize=remote&password=abcd1234",
      nowMs: 1000,
      ttlMs: 100,
    });
    expect(buildNoVncObserverTokenUrl("http://127.0.0.1:19999", token)).toBe(
      `http://127.0.0.1:19999/sandbox/novnc?token=${token}`,
    );
    expect(consumeNoVncObserverToken(token, 1050)).toContain("/vnc.html?");
    // 令牌只能使用一次
    expect(consumeNoVncObserverToken(token, 1050)).toBeNull();
  });

  it("观察者令牌过期后失效", () => {
    resetNoVncObserverTokensForTests();
    const token = issueNoVncObserverToken({
      url: "http://127.0.0.1:50123/vnc.html?autoconnect=1&resize=remote&password=abcd1234",
      nowMs: 1000,
      ttlMs: 100,
    });
    expect(consumeNoVncObserverToken(token, 1200)).toBeNull();
  });
});
