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



export const viewLetter = (id) => {

    window.open(
      getApiUrl(`/resignation/getResignationLetter/${id}`),
      "_blank"
    );
  };