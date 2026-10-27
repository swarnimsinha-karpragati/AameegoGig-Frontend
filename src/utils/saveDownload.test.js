import { isNativeWebViewDownload, mimeTypeForFileName, saveDownload } from "./saveDownload";

describe("mimeTypeForFileName", () => {
  test("prefers an explicit blob type and infers xlsx/pdf from the name", () => {
    expect(mimeTypeForFileName("a.xlsx", "application/pdf")).toBe("application/pdf");
    expect(mimeTypeForFileName("Attendance_Report.xlsx", "")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(mimeTypeForFileName("letter.pdf")).toBe("application/pdf");
  });
});

describe("saveDownload", () => {
  const originalCreate = window.URL.createObjectURL;
  const originalRevoke = window.URL.revokeObjectURL;
  let clicked;

  beforeEach(() => {
    clicked = [];
    window.URL.createObjectURL = jest.fn(() => "blob:report");
    window.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      clicked.push({ href: this.getAttribute("href"), download: this.getAttribute("download") });
    });
    delete window.ReactNativeWebView;
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
    delete window.ReactNativeWebView;
    jest.restoreAllMocks();
  });

  test("uses an anchor download in the browser", async () => {
    const blob = new Blob(["sheet"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const result = await saveDownload(blob, "Attendance_Report.xlsx");
    expect(result).toEqual({ method: "anchor" });
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: "blob:report", download: "Attendance_Report.xlsx" }]);
    expect(isNativeWebViewDownload()).toBe(false);
  });

  test("posts the file to the native app inside a WebView instead of a fake click", async () => {
    const posted = [];
    window.ReactNativeWebView = {
      postMessage: (raw) => posted.push(JSON.parse(raw)),
    };
    const blob = new Blob(["hello"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const result = await saveDownload(blob, "Attendance_Report.xlsx");
    expect(result).toEqual({ method: "native" });
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(clicked).toEqual([]);
    expect(posted).toEqual([
      {
        type: "DOWNLOAD_FILE",
        fileName: "Attendance_Report.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        base64: "aGVsbG8=",
      },
    ]);
  });
});
