import {
  isMobileAppBlockedError,
  mobileClientHeadersFromStorage,
  showMobileAppBlockedMessage,
} from "./mobileClientHeaders";

describe("mobileClientHeadersFromStorage", () => {
  test("does not send app headers in a normal browser session", () => {
    expect(mobileClientHeadersFromStorage({ getItem: () => null })).toEqual({});
  });

  test("forwards the key the next APK injects into the WebView", () => {
    const storage = {
      getItem: (name) =>
        ({
          workzaMobileClientKey: "next-build-secret",
          workzaMobileAppVersion: "1.0.5",
        }[name] || null),
    };
    expect(mobileClientHeadersFromStorage(storage)).toEqual({
      "X-Workza-Client-Key": "next-build-secret",
      "X-Workza-App-Version": "1.0.5",
    });
  });
});

describe("mobile app blocked overlay", () => {
  test("recognises the backend block and shows it once", () => {
    expect(
      isMobileAppBlockedError({
        response: { status: 403, data: { code: "MOBILE_APP_BLOCKED", message: "Use the website" } },
      })
    ).toBe(true);
    expect(isMobileAppBlockedError({ response: { status: 403, data: { message: "Nope" } } })).toBe(
      false
    );

    document.body.innerHTML = "";
    const first = showMobileAppBlockedMessage("Use the website");
    const second = showMobileAppBlockedMessage("Use the website");
    expect(first).toBe(second);
    expect(first.textContent).toBe("Use the website");
    expect(document.querySelectorAll("#workza-mobile-blocked")).toHaveLength(1);
  });
});
