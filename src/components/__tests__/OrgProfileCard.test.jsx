import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrgProfileCard, { checkImageFile } from "../OrgProfileCard";
import * as vendorService from "../../services/vendorService";

jest.mock("../../services/vendorService");

const profile = {
  name: "Aameego Tech",
  code: "AMG4288",
  companyAddress: "12 MG Road",
  contactEmail: "hr@aameego.com",
  employeeCodePrefix: "AMG",
  logoUrl: "",
  signatoryName: "",
  signatoryTitle: "",
  signatureImageUrl: "",
  stampImageUrl: "",
};

const renderCard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrgProfileCard />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  vendorService.getOrgProfile.mockResolvedValue({ data: { data: profile } });
  vendorService.updateOrgProfile.mockImplementation((payload) =>
    Promise.resolve({ data: { data: { ...profile, ...payload } } })
  );
  vendorService.uploadOrgBrandingImage.mockResolvedValue({ data: { data: {} } });
});

test("fields are editable and save sends the edited signatory details", async () => {
  renderCard();
  const name = await screen.findByLabelText(/Organization Name/);
  await userEvent.clear(name);
  await userEvent.type(name, "Aameego Labs");
  await userEvent.type(screen.getByLabelText(/Authorised Signatory Name/), "Priya Sharma");
  await userEvent.type(screen.getByLabelText(/Signatory Designation/), "Head HR");
  await userEvent.click(screen.getByRole("button", { name: /Save Organization Profile/ }));

  await waitFor(() => expect(vendorService.updateOrgProfile).toHaveBeenCalled());
  expect(vendorService.updateOrgProfile.mock.calls[0][0]).toMatchObject({
    name: "Aameego Labs",
    signatoryName: "Priya Sharma",
    signatoryTitle: "Head HR",
    employeeCodePrefix: "AMG",
  });
  expect(await screen.findByText(/Organization profile saved/)).toBeInTheDocument();
});

test("invalid input blocks save and shows the field error", async () => {
  renderCard();
  const signatory = await screen.findByLabelText(/Authorised Signatory Name/);
  await userEvent.type(signatory, "Priya 99");
  await userEvent.click(screen.getByRole("button", { name: /Save Organization Profile/ }));

  expect(await screen.findByText(/signatory name must contain only letters/i)).toBeInTheDocument();
  expect(signatory).toHaveAttribute("aria-invalid", "true");
  expect(vendorService.updateOrgProfile).not.toHaveBeenCalled();
});

test("employee code prefix is normalised while typing", async () => {
  renderCard();
  const prefix = await screen.findByLabelText(/Employee Code Prefix/);
  await userEvent.clear(prefix);
  await userEvent.type(prefix, "hr-1");
  expect(prefix).toHaveValue("HR1");
  expect(screen.getByText(/HR1-1, HR1-2/)).toBeInTheDocument();
});

test("server field errors are shown on the matching input", async () => {
  vendorService.updateOrgProfile.mockRejectedValue({
    response: { data: { message: "Signatory designation is invalid", field: "signatoryTitle" } },
  });
  renderCard();
  await screen.findByLabelText(/Organization Name/);
  await userEvent.click(screen.getByRole("button", { name: /Save Organization Profile/ }));
  await waitFor(() => expect(screen.getByLabelText(/Signatory Designation/)).toHaveAttribute("aria-invalid", "true"));
});

test("uploads a signature image and rejects non-image files", async () => {
  renderCard();
  const input = await screen.findByLabelText("Upload Signature");

  await userEvent.upload(input, new File(["x"], "sign.pdf", { type: "application/pdf" }), { applyAccept: false });
  expect(await screen.findByText(/Signature: Choose a PNG or JPG image/)).toBeInTheDocument();
  expect(vendorService.uploadOrgBrandingImage).not.toHaveBeenCalled();

  const png = new File(["x"], "sign.png", { type: "image/png" });
  await userEvent.upload(input, png);
  await waitFor(() => expect(vendorService.uploadOrgBrandingImage).toHaveBeenCalledWith("signature", png));
  expect(await screen.findByText(/Signature uploaded/)).toBeInTheDocument();
});

describe("checkImageFile", () => {
  test("enforces type and the 2 MB limit", () => {
    expect(checkImageFile({ type: "image/png", size: 2 * 1024 * 1024 })).toBeNull();
    expect(checkImageFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
    expect(checkImageFile({ type: "image/webp", size: 10 })).toMatch(/PNG or JPG/);
    expect(checkImageFile({ type: "image/webp", size: 10 }, { allowWebp: true })).toBeNull();
  });
});
