import API from "./apiClient";

/* =========================
   GET ALL DOCUMENTS
========================= */
export const getDocuments =
  async () => {
    return API.get(
      "/documents"
    );
  };

/* =========================
   UPLOAD DOCUMENT
========================= */
export const uploadDocument = async (
  file,
  category
) => {
  const formData = new FormData();

  formData.append("file", file);

  formData.append(
    "category",
    category
  );

  return API.post(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );
};

/* =========================
   DELETE DOCUMENT
========================= */
export const deleteDocument =
  async (id) => {
    return API.delete(
      `/documents/${id}`
    );
  };

/* =========================
   VIEW DOCUMENT
========================= */
export const viewDocument =
  (id) => {
    const token =
      localStorage.getItem("token");

    window.open(
      `http://localhost:5001/api/documents/view/${id}?token=${token}`,
      "_blank"
    );
  };

/* =========================
   DOWNLOAD DOCUMENT
========================= */
export const downloadDocument =
  (id) => {
    const token =
      localStorage.getItem("token");

    window.open(
      `http://localhost:5001/api/documents/view/${id}?token=${token}`,
      "_blank"
    );
  };


  export const uploadEmployeeDocument =
  async (formData) => {
    return API.post(
      "/documents/upload",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );
  };

  /* =========================
   GET EMPLOYEE DOCUMENTS
========================= */
export const getEmployeeDocuments =
async (employeeId) => {
  return API.get(
    `/documents/employee/${employeeId}`
  );
};