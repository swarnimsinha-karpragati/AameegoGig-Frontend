import { cameraAccessErrorMessage } from "./selfieCaptureCopy";

describe("cameraAccessErrorMessage", () => {
  test("tells the person how to allow the camera after a deny, not only that it failed", () => {
    expect(cameraAccessErrorMessage({ name: "NotAllowedError" })).toMatch(/Allow camera/i);
    expect(cameraAccessErrorMessage({ name: "NotAllowedError" })).toMatch(/Settings/i);
    expect(cameraAccessErrorMessage({ name: "NotAllowedError" })).not.toMatch(
      /^Camera permission denied\. Please allow camera access to check in\.$/
    );
  });

  test("keeps a generic retry path for other camera failures", () => {
    expect(cameraAccessErrorMessage({ name: "NotFoundError" })).toMatch(/try again/i);
  });
});
