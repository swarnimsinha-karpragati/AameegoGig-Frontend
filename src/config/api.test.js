import { envFromHostname } from "./api";

describe("envFromHostname", () => {
  it("treats the Workza development site as the development API", () => {
    expect(envFromHostname("dev.workza.ai")).toBe("development");
    expect(envFromHostname("preview.dev.workza.ai")).toBe("development");
    expect(envFromHostname("gig-dev.aameego.com")).toBe("development");
  });

  it("treats localhost as local and workza.ai as production", () => {
    expect(envFromHostname("localhost")).toBe("local");
    expect(envFromHostname("workza.ai")).toBe("production");
    expect(envFromHostname("www.workza.ai")).toBe("production");
  });
});
