import {
    useEffect,
    useState,
  } from "react";
  import MainLayout from "../layouts/MainLayout";
  import {
    Search,
    // Upload,  // reserved for future upload feature
    FileText,
    FileSpreadsheet,
    Image,
    Eye,
    Download,
    // Trash2,  // reserved for future delete feature
  } from "lucide-react";
  
  import {
    // getDocuments,       // reserved for future use
    // uploadDocument,     // reserved for future upload feature
    // deleteDocument,     // reserved for future delete feature
    viewDocument,
    downloadDocument,
    getEmployeeDocuments,
  } from "../services/documentService";
  
  function Documents() {
    /* =========================
       STATES
    ========================= */
    const [documents, setDocuments] =
      useState([]);
  
    const [search, setSearch] =
      useState("");
  
    const [
      activeCategory,
      setActiveCategory,
    ] = useState("All");
  
    // const [uploadFile, setUploadFile] =  // reserved for future upload feature
    //   useState(null);
  
    const [
      // uploadMessage,     // reserved for future upload feature
      // setUploadMessage,  // reserved for future upload feature
    ] = useState("");
  
    // const [loading, setLoading] =  // reserved for future upload feature
    //   useState(false);
  
    const categories = [
      "All",
      "General",
      "Policy",
      "Legal",
      "Finance",
      "Salary Slip",
    ];

    const [loggedInUser,setLoggedInUser] = useState(null)

    /* ==========================================================================
   1. INITIALIZE USER FROM LOCALSTORAGE
   ========================================================================== */
    useEffect(() => {
      try { 

        const storedUserData = localStorage.getItem("user");
        
        if (storedUserData) {
          
          const parsedUser = JSON.parse(storedUserData);
          
         
          setLoggedInUser({
            id: parsedUser.id || parsedUser._id, 
            employeeId: parsedUser.employeeId, 
            name: parsedUser.name || "Workspace User",
            role: parsedUser.role?.toLowerCase() || "employee",
            vendorId: parsedUser.vendorId || "6a2a49e3baf7ebc467381bf3"
          });
        }
      } catch (error) {
        console.error("Error loading user data from localStorage:", error);
      }
    }, []);
  
    /* =========================
       FETCH DOCUMENTS
    ========================= */
    const fetchDocuments =
      async () => {
        if (!loggedInUser || !loggedInUser.employeeId) return;
        try {
    
          const res =
            await getEmployeeDocuments(loggedInUser?.employeeId);
  
          setDocuments(
            res.data.documents || []
          );
         
        } catch (error) {
          console.error(
            "Error fetching documents:",
            error
          );
        }
      };
  
    useEffect(() => {
      fetchDocuments();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedInUser]);
  
    /* =========================
       GET ICON
    ========================= */
    const getIcon = (type) => {
      const fileType =
        type?.toLowerCase();
  
      if (
        fileType === "xls" ||
        fileType === "xlsx"
      ) {
        return (
          <FileSpreadsheet
            size={22}
          />
        );
      }
  
      if (
        fileType === "png" ||
        fileType === "jpg" ||
        fileType === "jpeg"
      ) {
        return (
          <Image size={22} />
        );
      }
  
      return (
        <FileText size={22} />
      );
    };
  
   
    /* =========================
       DELETE DOCUMENT
    ========================= */
    // const handleDelete =
    //   async (id) => {
    //     const confirmDelete =
    //       window.confirm(
    //         "Are you sure you want to delete this document?"
    //       );
  
    //     if (!confirmDelete)
    //       return;
  
    //     try {
    //       await deleteDocument(
    //         id
    //       );
  
    //       alert(
    //         "Document deleted successfully"
    //       );
  
    //       fetchDocuments();
    //     } catch (error) {
    //       alert(
    //         error.response?.data
    //           ?.message ||
    //           "Delete failed"
    //       );
    //     }
    //   };
  
      /* =======================
      UPLOAD DOCUMENT
      ========================*/

      // const handleUpload = async () => {
      //   if (!uploadFile) {
      //     alert("Please select a file");
      //     return;
      //   }
      
      //   try {
      //     setLoading(true);
      
      //     const res = await uploadDocument(
      //       uploadFile,
      //       category
      //     );
      
      //     setUploadMessage(
      //       res.data.message ||
      //         "Document uploaded successfully"
      //     );
      
      //     setUploadFile(null);
      //     setCategory("General");
      //     setShowUploadModal(false);
      
      //     fetchDocuments();
      //   } catch (error) {
      //           if (
      //             error.response?.data?.message?.includes(
      //               "File too large"
      //             )
      //           ) {
      //             alert(
      //               "File size should be less than 20 MB"
      //             );
      //           } else {
      //             alert(
      //               error.response?.data?.message ||
      //               "Upload failed"
      //             );
      //         }
      //   } finally {
      //     setLoading(false);
      //   }
      // };
      
    /* =========================
       FILTER DOCUMENTS
    ========================= */
    const filteredDocuments =
    documents.filter((doc) => {
      const matchesSearch =
        doc.fileName
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );
  
      const currentCategory =
        activeCategory
          ?.trim()
          .toLowerCase();
  
      const documentCategory =
        doc.category
          ?.trim()
          .toLowerCase();
  
      if (
        currentCategory === "all"
      ) {
        return matchesSearch;
      }
  
      return (
        matchesSearch &&
        documentCategory ===
          currentCategory
      );
    });

      /* ======================
      SELECT CATEGORY
      ======================= */
      

      // const [showUploadModal, setShowUploadModal] =  // reserved for future upload feature
      // useState(false);

     // const [category, setCategory] =  // reserved for future upload feature
     // useState("General");

      return (
        <MainLayout>
          <div className="documents-page">
            {/* HEADER */}
            <div className="documents-header">
              <div>
                <h1>Documents</h1>
                <p>
                  Total Documents:{" "}
                  <strong>
                    {
                      documents.length
                    }
                  </strong>
                </p>
              </div>
    
              {/* <button
  className="upload-document-btn"
  onClick={() =>
    setShowUploadModal(true)
  }
>
  <Upload size={18} />
  Upload Document
</button> */}
            </div>
    
            {/* MESSAGE
            {uploadMessage && (
              <p className="success">
                {uploadMessage}
              </p>
            )} */}
    
            {/* SEARCH + FILTER */}
            <div className="documents-toolbar-card">
              <div className="search-wrapper">
                <Search
                  size={18}
                />
    
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />
              </div>
    
              <div className="document-filters">
                {categories.map(
                  (
                    category
                  ) => (
                    <button
                      key={
                        category
                      }
                      className={`filter-btn ${
                        activeCategory ===
                        category
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveCategory(
                          category
                        )
                      }
                    >
                      {
                        category
                      }
                    </button>
                  )
                )}
              </div>
            </div>
    
            {/* DOCUMENT GRID */}
            <div className="documents-grid">
              {filteredDocuments.length >
              0 ? (
                filteredDocuments.map(
                  (
                    doc
                  ) => (
                    <div
                      key={
                        doc._id
                      }
                      className="document-card"
                    >
                      <div className="document-top">
                        <div className="document-icon">
                          {getIcon(
                            doc.fileType
                          )}
                        </div>
    
                        <div className="document-info">
                          <h3>
                            {
                              doc.fileName
                            }
                          </h3>
    
                          <p>
                            {
                              doc.fileSize
                            }{" "}
                            •{" "}
                            {
                              doc.fileType
                            }
                          </p>
    
                          <span>
                            by{" "}
                            {
                              doc.uploadedBy
                            }
                          </span>
                        </div>
                      </div>
    
                      <div className="document-bottom">
                        <span>
                          {new Date(
                            doc.createdAt
                          ).toLocaleDateString()}
                        </span>
    
                        <div className="document-actions">
                          <button
                            onClick={() =>
                              viewDocument(
                                doc._id
                              )
                            }
                          >
                            <Eye
                              size={
                                16
                              }
                            />
                          </button>
    
                          <button
                            onClick={() =>
                              downloadDocument(
                                doc._id
                              )
                            }
                          >
                            <Download
                              size={
                                16
                              }
                            />
                          </button>
    
                          {/* <button
                            className="delete"
                            onClick={() =>
                              handleDelete(
                                doc._id
                              )
                            }
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                          </button> */}
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p>
                  No documents
                  found.
                </p>
              )}
            </div>
          </div>
          {/* {showUploadModal && (
  <div className="modal-overlay">
      <div className="upload-modal">
  <h2>Upload Document</h2>

  <div className="custom-file-upload">
    <button
      type="button"
      className="choose-file-btn"
      onClick={() =>
        document.getElementById("fileInput").click()
      }
    >
      Choose File
    </button>

    <span className="file-name">
      {uploadFile
        ? uploadFile.name
        : "No file selected"}
    </span>

    <input
      id="fileInput"
      type="file"
      className="hidden-file-input"
      onChange={(e) =>
        setUploadFile(e.target.files[0])
      }
    />
  </div>

  <select
    className="upload-category"
    value={category}
    onChange={(e) =>
      setCategory(e.target.value)
    }
  >
    <option>General</option>
    <option>Finance</option>
    <option>Legal</option>
    <option>Policy</option>
  </select>

  <div className="modal-actions">
  <button
  className="cancel-btn"
  onClick={() =>
    setShowUploadModal(false)
  }
>
  Cancel
</button>

<button
  className="upload-btn"
  onClick={handleUpload}
  disabled={loading}
>
  {loading
    ? "Uploading..."
    : "Upload"}
</button>
  </div>
</div>
  </div>
)} */}
        </MainLayout>
      );
    }
    
    export default Documents;