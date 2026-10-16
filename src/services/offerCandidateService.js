import API from "./apiClient";

/** Letter APIs use the standard `{ success, data }` envelope. */
const dataOf = (response) => response.data?.data;

/** The list/detail APIs populate departmentId; forms need the plain id plus a display name. */
export const normalizeCandidate = (candidate) => {
  if (!candidate) return candidate;
  const department = candidate.departmentId;
  const populated = department && typeof department === "object";
  const employee = candidate.employeeId;
  return {
    ...candidate,
    departmentId: populated ? String(department._id) : department || "",
    departmentName: populated ? department.name || "" : candidate.departmentName || "",
    ...(employee && typeof employee === "object"
      ? { employeeId: String(employee._id), employeeName: employee.name || "", employeeCode: employee.employeeCode || "" }
      : {}),
  };
};

/** -> { candidates, pagination: { page, limit, total, totalPages } } */
export const getOfferCandidates = async (params = {}) => {
  const body = (await API.get("/offer-candidates", { params })).data || {};
  return { candidates: (body.data || []).map(normalizeCandidate), pagination: body.pagination || null };
};

/** -> candidate (its issued letters are listed on the Issued letters tab) */
export const getOfferCandidate = async (id) =>
  normalizeCandidate(dataOf(await API.get(`/offer-candidates/${id}`))?.candidate);

export const createOfferCandidate = async (payload) =>
  normalizeCandidate(dataOf(await API.post("/offer-candidates", payload)));

export const updateOfferCandidate = async (id, payload) =>
  normalizeCandidate(dataOf(await API.put(`/offer-candidates/${id}`, payload)));

export const deleteOfferCandidate = async (id) => (await API.delete(`/offer-candidates/${id}`)).data;

export const setOfferCandidateStatus = async (id, status, note = "") => {
  const trimmed = String(note ?? "").trim();
  return normalizeCandidate(dataOf(await API.post(`/offer-candidates/${id}/status`, trimmed ? { status, note: trimmed } : { status })));
};

/**
 * -> { name, email, phone, permanentAddress, designation, department, dateOfJoining, annualCTC }
 * Only accepted candidates can be converted.
 */
export const getOfferCandidateConversion = async (id) =>
  dataOf(await API.post(`/offer-candidates/${id}/convert`))?.prefill || {};

export const linkOfferCandidateEmployee = async (id, employeeId) =>
  normalizeCandidate(dataOf(await API.post(`/offer-candidates/${id}/link-employee`, { employeeId })));
