// services/program.js
import axios from "axios";
import { server } from "../server";
import { secureStore } from "./storage";

/* ------------------------------------------------------
   Helper: Inject bearer token into headers automatically
------------------------------------------------------ */
async function getAuthHeaders() {
  const token = await secureStore.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------
   UNIVERSAL UNWRAP FUNCTION
   Handles:
   - { success, data: {...} }
   - { success, message }
   - direct array responses
   - pagination responses
------------------------------------------------------ */
function unwrap(res) {
  if (!res) return null;

  const d = res.data ?? res;

  // If backend wrapped response: { success: true, data: {...} }
  if (typeof d === "object" && d.data) {
    return d.data;
  }

  // If plain list
  if (Array.isArray(d)) return d;

  // If plain object from server
  return d;
}

export const programService = {
  /* ------------------------------------------------------
     PUBLIC PROGRAMS
  ------------------------------------------------------ */
  async getPublicPrograms() {
    const res = await axios.get(`${server}/programs/public`);
    return unwrap(res); // { programs, pagination }
  },

  /* ------------------------------------------------------
     GET ALL PROGRAMS (AUTH REQUIRED)
  ------------------------------------------------------ */
  async getAllPrograms() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs`, { headers });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     GET PROGRAM (FULL PAYLOAD)
     Always returns:
     {
        program,
        isEnrolled,
        userProgress
     }
  ------------------------------------------------------ */
  async getProgram(id) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/${id}`, { headers });

    // Case 1: backend returns { success, data: {...} }
    if (res.data?.data) {
      const d = res.data.data;
      console.log("DATA", d);
      return {
        program: d.program,
        isEnrolled: d.isEnrolled,
        userProgress: d.userProgress ?? { progress: 0 },
      };
    }

    // Case 2: backend returned flattened structure
    const d = res.data;
    return {
      program: d.program,
      isEnrolled: d.isEnrolled,
      userProgress: d.userProgress ?? { progress: 0 },
    };
  },

  /* ------------------------------------------------------
     USER PROGRAM LISTS
  ------------------------------------------------------ */
  async getMyPrograms() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/my-programs`, { headers });
    return unwrap(res);
  },

  async getContinuePrograms() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/my-programs/continue`, {
      headers,
    });
    return unwrap(res);
  },

  async getCompletedPrograms() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/my-programs/completed`, {
      headers,
    });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     ADVANCED SEARCH
  ------------------------------------------------------ */
  async searchPrograms(queryParams) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/search/advanced`, {
      params: queryParams,
      headers,
    });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     RECOMMENDED PROGRAMS
  ------------------------------------------------------ */
  async getRecommendedPrograms() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/recommendations/for-you`, {
      headers,
    });
    const d = unwrap(res);
    return d.recommendedPrograms || d;
  },

  /* ------------------------------------------------------
     CREATE PROGRAM
  ------------------------------------------------------ */
  async createProgram(formData) {
    const headers = {
      ...(await getAuthHeaders()),
      "Content-Type": "multipart/form-data",
    };
    const res = await axios.post(`${server}/programs`, formData, { headers });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     UPDATE PROGRAM
  ------------------------------------------------------ */
  async updateProgram(id, formData) {
    const headers = {
      ...(await getAuthHeaders()),
      "Content-Type": "multipart/form-data",
    };
    const res = await axios.put(`${server}/programs/${id}`, formData, {
      headers,
    });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     DELETE PROGRAM
  ------------------------------------------------------ */
  async deleteProgram(id) {
    const headers = await getAuthHeaders();
    const res = await axios.delete(`${server}/programs/${id}`, { headers });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     ENROLL
     Returns ALWAYS:
     {
       isEnrolled: true,
       userProgress: {progress:0}
     }
  ------------------------------------------------------ */
  async enroll(id) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/programs/${id}/enroll`,
      {},
      { headers }
    );

    // Backend returns: { success, data: { program, isEnrolled, userProgress } }
    if (res.data?.data) {
      return {
        program: res.data.data.program,
        isEnrolled: res.data.data.isEnrolled,
        userProgress: res.data.data.userProgress,
      };
    }

    return unwrap(res);
  },

  /* ------------------------------------------------------
     BUY PROGRAM
  ------------------------------------------------------ */
  async buyProgram(id) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/programs/${id}/buy`, {}, { headers });

    return {
      success: true,
      message: "Purchased successfully",
    };
  },

  /* ------------------------------------------------------
     LEAVE PROGRAM
     Always returns:
     {
       isEnrolled: false
     }
  ------------------------------------------------------ */
  async leaveProgram(id) {
    const headers = await getAuthHeaders();
    await axios.delete(`${server}/programs/${id}/leave`, { headers });

    return { isEnrolled: false };
  },

  /* ------------------------------------------------------
     COMPLETE MODULE
     Returns participant object
  ------------------------------------------------------ */
  async completeModule(programId, moduleOrder) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/programs/${programId}/modules/${moduleOrder}/complete`,
      {},
      { headers }
    );

    const d = res.data?.data || res.data;

    return {
      completedModules: d.completedModules || [],
      progress: d.progress || 0,
      isCompleted: !!d.isCompleted,
    };
  },


  /* ------------------------------------------------------
     REVIEWS & COMMENTS
  ------------------------------------------------------ */
  async addReview(id, payload) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/programs/${id}/reviews`, payload, {
      headers,
    });

    // If backend returns created review inside data
    if (res.data?.data?.review) {
      return { review: res.data.data.review };
    }

    // If backend returns entire data object
    if (res.data?.data) {
      return res.data.data;
    }

    // Fallback (old backend)
    return {
      review: {
        _id: Date.now().toString(),
        rating: payload.rating,
        reviewText: payload.reviewText,
        createdAt: new Date().toISOString(),
        user: {}, // backend will refresh on reload
      },
    };
  },


  async addComment(id, payload) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/programs/${id}/comments`, payload, {
      headers,
    });

    // If backend returns created comment
    if (res.data?.data?.comment) {
      return { comment: res.data.data.comment };
    }

    if (res.data?.data) {
      return res.data.data;
    }

    // fallback (fake object so redux updates instantly)
    return {
      comment: {
        _id: Date.now().toString(),
        text: payload.text,
        parent: payload.parent || null,
        createdAt: new Date().toISOString(),
        user: {},
      },
    };
  },

  // DELETE REVIEW (returns updated review list)
async deleteReview(programId, reviewId) {
  const headers = await getAuthHeaders();

  console.log("🔐 DELETE REVIEW HEADERS:", headers);

  const res = await axios({
    method: "DELETE",
    url: `${server}/programs/${programId}/reviews/${reviewId}`,
    headers: { ...headers },   // Explicitly force headers
  });

  const d = res.data?.data || res.data;
  console.log("DELETE REVIEW RESPONSE DATA:", d);

  return {
    reviewId,
    reviews: d.reviews || [],
    message: d.message || "Review deleted"
  };
},


  // DELETE COMMENT (removes comment + replies)
async deleteComment(programId, commentId) {
  const headers = await getAuthHeaders();

  console.log("🔐 DELETE COMMENT HEADERS:", headers);

  const res = await axios({
    method: "DELETE",
    url: `${server}/programs/${programId}/comments/${commentId}`,
    headers: { ...headers },   // Explicitly force headers
  });

  const d = res.data?.data || res.data;
  console.log("DELETE COMMENT RESPONSE DATA:", d);

  return {
    commentId,
    comments: d.comments || [],
    message: d.message || "Comment deleted"
  };
},


  /* ------------------------------------------------------
     PROGRAM ANALYTICS
  ------------------------------------------------------ */
  async getProgramStats(id) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/${id}/stats`, { headers });
    return unwrap(res);
  },

  async getParticipants(id) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/${id}/participants`, {
      headers,
    });
    return unwrap(res);
  },

  /* ------------------------------------------------------
     CERTIFICATE
  ------------------------------------------------------ */
  async getCertificate(id) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/programs/${id}/certificate`, { headers });
    return res.data.data;
  },

  /* ------------------------------------------------------
     MODULE MANAGEMENT (Organizer/Admin)
  ------------------------------------------------------ */
  async addModule(id, payload) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/programs/${id}/modules`, payload, {
      headers,
    });
    return unwrap(res);
  },
};
