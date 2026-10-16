import { parseBlobError } from "./blobError";

const blobError = (parts, type) => ({ response: { status: 400, data: new Blob(parts, { type }) } });

describe("parseBlobError", () => {
  test("replaces a JSON blob body with the parsed object", async () => {
    const error = blobError([JSON.stringify({ success: false, message: "Select a valid employee", field: "employeeId" })], "application/json");
    const result = await parseBlobError(error);
    expect(result).toBe(error);
    expect(result.response.data).toEqual({ success: false, message: "Select a valid employee", field: "employeeId" });
  });

  test("parses JSON text even when the blob has no JSON content type", async () => {
    const error = blobError(['{"message":"No data"}'], "");
    expect((await parseBlobError(error)).response.data).toEqual({ message: "No data" });
  });

  test("leaves a non-JSON blob untouched", async () => {
    const error = blobError(["<html>Bad gateway</html>"], "text/html");
    const original = error.response.data;
    expect((await parseBlobError(error)).response.data).toBe(original);
  });

  test("leaves a blob holding a JSON primitive untouched", async () => {
    const error = blobError(["42"], "application/json");
    const original = error.response.data;
    expect((await parseBlobError(error)).response.data).toBe(original);
  });

  test("returns a non-blob error unchanged", async () => {
    const error = { response: { data: { message: "Already JSON" } } };
    expect(await parseBlobError(error)).toEqual({ response: { data: { message: "Already JSON" } } });
  });

  test("returns errors without a response unchanged", async () => {
    const network = new Error("Network Error");
    expect(await parseBlobError(network)).toBe(network);
    expect(await parseBlobError(undefined)).toBeUndefined();
  });
});
