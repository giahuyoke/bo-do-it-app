import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { config: { authDomain: "bo-do-it-app.vercel.app" } },
  popup: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => mocks.auth,
}));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class { setCustomParameters() {} },
  signInWithPopup: mocks.popup,
  signInWithRedirect: mocks.redirect,
  signOut: vi.fn(),
}));

import { signInWithGoogle } from "@/lib/firebase/auth";

describe("Google sign-in routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.popup.mockResolvedValue({ user: { uid: "test-user" } });
    mocks.redirect.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  test("uses same-tab login on the configured HTTPS auth origin without opening a popup", async () => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", host: "bo-do-it-app.vercel.app" },
    });
    await signInWithGoogle();
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  test.each([
    ["http:", "localhost:3000"],
    ["https:", "preview.vercel.app"],
  ])("keeps popup login for %s//%s without a matching callback", async (protocol, host) => {
    vi.stubGlobal("window", { location: { protocol, host } });
    const result = signInWithGoogle();
    // Popup must be requested in the click's call stack, before any await.
    expect(mocks.popup).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
    await expect(result).resolves.toMatchObject({ user: { uid: "test-user" } });
  });

  test("propagates redirect failures to the UI instead of retrying in a loop", async () => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", host: "bo-do-it-app.vercel.app" },
    });
    const error = new Error("auth/unauthorized-domain");
    mocks.redirect.mockRejectedValueOnce(error);
    await expect(signInWithGoogle()).rejects.toBe(error);
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.popup).not.toHaveBeenCalled();
  });
});
