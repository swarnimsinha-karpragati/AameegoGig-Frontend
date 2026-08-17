import { getApiUrl } from "../config/api";
import API from "./apiClient";

export const createResignation = async (data) => {
  return API.post("/resignation/createResignation", data);
};

export const getResignation = async (vendorId,employeeId) => {
  return API.get(`/resignation/getResignation?vendorId=${vendorId}&employeeId=${employeeId}`);
};

export const updateResignation = async (id,data) => {
  return API.patch(`/resignation/updateStatus/${id}`,data);
};

export const rejectResignation = async (id,rejectedBy) => {
  return API.patch(`/resignation/rejectResignation/?id=${id}&rejectedBy=${rejectedBy}`);
};

export const finalApproval = async (id,payload) => {
  return API.patch(`/resignation/finalApproval/${id}`,payload);
};



export const viewLetter = (id,type) => {

    let vendorCode = "";
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      vendorCode = user?.vendor_code || "";
    } catch {
      vendorCode = "";
    }

    const separator = vendorCode ? `&vendorCode=${encodeURIComponent(vendorCode)}` : "";

    window.open(
      getApiUrl(`/resignation/getResignationLetter/?id=${id}&type=${type}${separator}`),
      "_blank"
    );
  };