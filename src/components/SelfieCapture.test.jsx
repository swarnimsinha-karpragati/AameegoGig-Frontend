import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SelfieCapture from "./SelfieCapture";

const denied = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });

const mockGetUserMedia = (impl) => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: impl },
  });
};

describe("SelfieCapture after a denied camera", () => {
  test("offers Allow camera so check-in is not stuck on the error text", async () => {
    const getUserMedia = jest.fn().mockRejectedValue(denied);
    mockGetUserMedia(getUserMedia);

    render(<SelfieCapture open onClose={jest.fn()} onCapture={jest.fn()} />);

    const allow = await screen.findByRole("button", { name: /Allow camera/i });
    expect(allow).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Capture Selfie/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Allow camera/i }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  });
});
