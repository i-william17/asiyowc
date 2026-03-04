// services/support.js

import axios from "axios";
import { server } from "../server";
import { Platform } from "react-native";

/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({
    baseURL: server, // e.g. http://192.168.1.112:5000/api
    timeout: 20000,
});

/* ============================================================
   AUTH HEADERS
============================================================ */

const authHeaders = (token) => {
    if (!token) throw new Error("Auth token missing");

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

/* ============================================================
   SUPPORT SERVICE
============================================================ */

export const supportService = {

    /* ============================================================
       CREATE SUPPORT TICKET
       POST /api/support/ticket
       multipart/form-data
    ============================================================ */
    createSupportTicket: async (payload, token) => {

        if (!token) throw new Error("Auth token missing");

        const formData = new FormData();

        formData.append("subject", payload.subject);
        formData.append("message", payload.message);
        formData.append("category", payload.category);
        formData.append("priority", payload.priority);

        if (payload.media) {

            /* ================= WEB ================= */
            if (Platform.OS === "web") {
                const response = await fetch(payload.media.uri);
                const blob = await response.blob();

                formData.append("media", blob, payload.media.name || "upload.jpg");
            }

            /* ================= MOBILE ================= */
            else {
                formData.append("media", {
                    uri: payload.media.uri,
                    name: payload.media.name || "upload.jpg",
                    type: payload.media.type || "image/jpeg",
                });
            }
        }

        const res = await api.post(
            "support/ticket",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return res.data;
    },

    /* ============================================================
       CREATE FEEDBACK
       POST /api/support/feedback
    ============================================================ */

    createFeedback: async (payload, token) => {

        if (!token) throw new Error("Auth token missing");

        const res = await api.post(
            "support/feedback",
            payload,
            {
                headers: authHeaders(token),
            }
        );

        return res.data;
    },

};