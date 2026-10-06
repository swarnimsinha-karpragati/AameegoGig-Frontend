import API from "../apiClient";
import * as templates from "../letterTemplateService";
import * as letters from "../letterService";
import * as candidates from "../offerCandidateService";

jest.mock("../apiClient", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

const reply = (body) => Promise.resolve({ data: body });

beforeEach(() => jest.resetAllMocks());

describe("letter template service reads the { success, data } envelope", () => {
  test("list, single, versions and placeholders", async () => {
    API.get.mockReturnValueOnce(reply({ success: true, data: [{ _id: "t1" }] }));
    expect(await templates.getLetterTemplates({ status: "all" })).toEqual([{ _id: "t1" }]);
    expect(API.get).toHaveBeenCalledWith("/letter-templates", { params: { status: "all" } });

    API.get.mockReturnValueOnce(reply({ success: true, data: { _id: "t1", version: 3 } }));
    expect(await templates.getLetterTemplate("t1")).toEqual({ _id: "t1", version: 3 });

    API.get.mockReturnValueOnce(reply({ success: true, data: [{ version: 2, note: "x", editedByName: "HR" }] }));
    expect(await templates.getLetterTemplateVersions("t1")).toEqual([{ version: 2, note: "x", editedByName: "HR" }]);

    API.get.mockReturnValueOnce(reply({ success: true, data: { groups: [{ group: "Employee", placeholders: [] }] } }));
    expect(await templates.getLetterPlaceholders("employee")).toEqual([{ group: "Employee", placeholders: [] }]);
  });

  test("empty bodies fall back to safe defaults", async () => {
    API.get.mockReturnValue(reply({}));
    expect(await templates.getLetterTemplates()).toEqual([]);
    expect(await templates.getLetterPlaceholders("employee")).toEqual([]);
    expect(await templates.getLetterTemplateVersions("t1")).toEqual([]);
  });

  test("preview uses the id-less route for unsaved drafts", async () => {
    API.post.mockReturnValue(reply({ success: true, data: { html: "<p/>", missing: [] } }));
    expect(await templates.previewLetterTemplate(null, { bodyHtml: "x" })).toEqual({ html: "<p/>", missing: [] });
    expect(API.post).toHaveBeenLastCalledWith("/letter-templates/preview", { bodyHtml: "x" });
    await templates.previewLetterTemplate("t1", {});
    expect(API.post).toHaveBeenLastCalledWith("/letter-templates/t1/preview", {});
  });
});

describe("letter service", () => {
  test("issue derives emailed from the letter's emailedAt", async () => {
    API.post.mockReturnValueOnce(reply({ success: true, data: { letter: { _id: "L1", emailedAt: "2026-10-05" }, emailError: null } }));
    expect(await letters.issueLetter({})).toMatchObject({ emailed: true, letter: { _id: "L1" } });

    API.post.mockReturnValueOnce(reply({ success: true, data: { letter: { _id: "L2" }, emailError: "Mail down" } }));
    expect(await letters.issueLetter({})).toMatchObject({ emailed: false, emailError: "Mail down" });
  });

  test("list returns letters and pagination", async () => {
    const pagination = { page: 2, limit: 20, total: 21, totalPages: 2 };
    API.get.mockReturnValueOnce(reply({ success: true, data: [{ _id: "L1" }], pagination }));
    expect(await letters.getIssuedLetters({ page: 2 })).toEqual({ letters: [{ _id: "L1" }], pagination });
  });

  test("email, void and recipients unwrap data", async () => {
    API.post.mockReturnValueOnce(reply({ success: true, data: { _id: "L1", emailedAt: "x" } }));
    expect(await letters.emailIssuedLetter("L1")).toEqual({ _id: "L1", emailedAt: "x" });
    API.post.mockReturnValueOnce(reply({ success: true, data: { _id: "L1", status: "void" } }));
    expect(await letters.voidIssuedLetter("L1", "typo")).toEqual({ _id: "L1", status: "void" });
    expect(API.post).toHaveBeenLastCalledWith("/letters/L1/void", { reason: "typo" });
    API.get.mockReturnValueOnce(reply({ success: true, data: [{ _id: "e1" }] }));
    expect(await letters.getLetterRecipients({ recipientType: "employee" })).toEqual([{ _id: "e1" }]);
  });

  test("recipients are narrowed to the chosen template only when one is given", async () => {
    API.get.mockReturnValue(reply({ success: true, data: [] }));
    await letters.getLetterRecipients({ recipientType: "candidate", search: "ne", templateId: "t-offer" });
    expect(API.get).toHaveBeenLastCalledWith("/letters/recipients", {
      params: { recipientType: "candidate", search: "ne", id: "", templateId: "t-offer" },
    });
    await letters.getLetterRecipients({ recipientType: "employee" });
    expect(API.get.mock.calls.at(-1)[1].params).not.toHaveProperty("templateId");
  });

  describe("downloadDraftLetter", () => {
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    let clicked;

    beforeEach(() => {
      clicked = [];
      window.URL.createObjectURL = jest.fn(() => "blob:draft");
      window.URL.revokeObjectURL = jest.fn();
      jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
        clicked.push({ href: this.getAttribute("href"), download: this.getAttribute("download") });
      });
    });

    afterEach(() => {
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
      jest.restoreAllMocks();
    });

    test("posts the payload for a blob and saves it under the given name", async () => {
      const blob = new Blob(["%PDF"], { type: "application/pdf" });
      API.post.mockReturnValueOnce(reply(blob));
      const payload = { templateId: "t1", employeeId: "e1", values: { reason: "Late" } };

      await letters.downloadDraftLetter(payload, "Warning_Letter_DRAFT.pdf");

      expect(API.post).toHaveBeenCalledWith("/letters/preview/pdf", payload, { responseType: "blob" });
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(clicked).toEqual([{ href: "blob:draft", download: "Warning_Letter_DRAFT.pdf" }]);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:draft");
      expect(document.querySelector("a[download]")).toBeNull();
    });

    test("a JSON error body sent as a blob reaches the caller as a normal error", async () => {
      const body = { success: false, message: "Select a valid employee", field: "employeeId", code: "VALIDATION" };
      API.post.mockRejectedValueOnce({
        response: { status: 400, data: new Blob([JSON.stringify(body)], { type: "application/json" }) },
      });
      const caught = await letters.downloadDraftLetter({ templateId: "t1" }).catch((error) => error);
      expect(caught.response.data instanceof Blob).toBe(false);
      expect(caught.response.data).toEqual(body);
      expect(caught.response.status).toBe(400);
      expect(clicked).toEqual([]);
    });

    test("an issued letter download error is parsed the same way", async () => {
      API.get.mockRejectedValueOnce({
        response: { status: 404, data: new Blob(['{"message":"Letter file not found"}'], { type: "application/json" }) },
      });
      const caught = await letters.downloadIssuedLetter("L1").catch((error) => error);
      expect(caught.response.data instanceof Blob).toBe(false);
      expect(caught.response.data.message).toBe("Letter file not found");
    });

    test("an issued letter is saved under the server's file name (letter number), else the given fallback", async () => {
      const pdf = new Blob(["%PDF"]);
      API.get.mockResolvedValueOnce({
        data: pdf,
        headers: { "content-disposition": 'attachment; filename="Warning_Letter_ACM_WRN_2026_0001.pdf"' },
      });
      await letters.downloadIssuedLetter("L1", "fallback.pdf");
      expect(API.get).toHaveBeenLastCalledWith("/letters/L1/download", { responseType: "blob" });

      API.get.mockResolvedValueOnce({
        data: pdf,
        headers: { "content-disposition": "attachment; filename*=UTF-8''Offer_Letter_%E2%82%B9_1.pdf" },
      });
      await letters.downloadIssuedLetter("L2", "fallback.pdf");

      API.get.mockResolvedValueOnce({ data: pdf, headers: {} });
      await letters.downloadIssuedLetter("L3", "WRN_2026_0003.pdf");

      expect(clicked.map((c) => c.download)).toEqual([
        "Warning_Letter_ACM_WRN_2026_0001.pdf",
        "Offer_Letter_₹_1.pdf",
        "WRN_2026_0003.pdf",
      ]);
    });

    test("falls back to a generic draft file name", async () => {
      API.post.mockReturnValueOnce(reply(new Blob(["%PDF"])));
      await letters.downloadDraftLetter({ templateId: "t1" });
      expect(clicked[0].download).toBe("letter_DRAFT.pdf");
    });
  });
});

describe("offer candidate service", () => {
  test("normalises a populated department into id + name", async () => {
    API.get.mockReturnValueOnce(
      reply({ success: true, data: [{ _id: "c1", departmentId: { _id: "d1", name: "Design" } }, { _id: "c2", departmentId: null }], pagination: { total: 2 } })
    );
    const result = await candidates.getOfferCandidates();
    expect(result.candidates).toEqual([
      { _id: "c1", departmentId: "d1", departmentName: "Design" },
      { _id: "c2", departmentId: "", departmentName: "" },
    ]);
    expect(result.pagination).toEqual({ total: 2 });
  });

  test("normalises a populated employee into id + name + code and leaves a bare id alone", async () => {
    API.get.mockReturnValueOnce(
      reply({
        success: true,
        data: [
          { _id: "c1", status: "converted", employeeId: { _id: "e1", name: "Kiran Das", employeeCode: "EMP-7" } },
          { _id: "c2", status: "converted", employeeId: "e2" },
          { _id: "c3", status: "converted", employeeId: null },
        ],
      })
    );
    const { candidates: rows } = await candidates.getOfferCandidates();
    expect(rows[0]).toMatchObject({ employeeId: "e1", employeeName: "Kiran Das", employeeCode: "EMP-7" });
    expect(rows[1]).toMatchObject({ employeeId: "e2" });
    expect(rows[1]).not.toHaveProperty("employeeCode");
    expect(rows[2].employeeId).toBeNull();
  });

  test("detail reads data.candidate; create/status return the candidate", async () => {
    API.get.mockReturnValueOnce(reply({ success: true, data: { candidate: { _id: "c1", departmentId: "d1" }, letters: [] } }));
    expect(await candidates.getOfferCandidate("c1")).toMatchObject({ _id: "c1", departmentId: "d1" });
    API.post.mockReturnValueOnce(reply({ success: true, data: { _id: "c1", status: "offered" } }));
    expect(await candidates.setOfferCandidateStatus("c1", "offered")).toMatchObject({ status: "offered" });
  });

  test("status changes send the note only when there is one", async () => {
    API.post.mockReturnValue(reply({ success: true, data: { _id: "c1", status: "accepted" } }));
    await candidates.setOfferCandidateStatus("c1", "accepted", "Called on Monday");
    expect(API.post).toHaveBeenLastCalledWith("/offer-candidates/c1/status", { status: "accepted", note: "Called on Monday" });
    await candidates.setOfferCandidateStatus("c1", "accepted", "  ");
    expect(API.post).toHaveBeenLastCalledWith("/offer-candidates/c1/status", { status: "accepted" });
    await candidates.setOfferCandidateStatus("c1", "accepted");
    expect(API.post).toHaveBeenLastCalledWith("/offer-candidates/c1/status", { status: "accepted" });
  });

  test("conversion returns the flat prefill", async () => {
    API.post.mockReturnValueOnce(reply({ success: true, data: { candidateId: "c1", prefill: { name: "Neha", annualCTC: 5 } } }));
    expect(await candidates.getOfferCandidateConversion("c1")).toEqual({ name: "Neha", annualCTC: 5 });
  });
});
