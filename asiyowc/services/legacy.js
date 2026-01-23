import axios from "axios";
import { server } from "../server";

export const legacyService = {
    fetchTributes: async ({ page = 1, limit = 5 }) => {
        const res = await axios.get(`${server}/legacy`, {
            params: { page, limit },
        });
        return res.data;
    },

    fetchTributeById: async (id) => {
        const res = await axios.get(`${server}/legacy/${id}`);
        return res.data;
    },

    createTribute: async (payload, token) => {
        const res = await axios.post(`${server}/legacy`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    },

    updateTribute: async (id, payload, token) => {
        const res = await axios.put(`${server}/legacy/${id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    },

    deleteTribute: async (id, token) => {
        const res = await axios.delete(`${server}/legacy/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    },

    toggleLikeTribute: async (id, token) => {
        const res = await axios.post(
            `${server}/legacy/${id}/like`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    },

    addTributeComment: async (tributeId, payload, token) => {
        const res = await axios.post(
            `${server}/legacy/${tributeId}/comments`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    },

    deleteTributeComment: async (tributeId, commentId, token) => {
        const res = await axios.delete(
            `${server}/legacy/${tributeId}/comments/${commentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    },

    toggleLikeComment: async (tributeId, commentId, token) => {
        const res = await axios.post(
            `${server}/legacy/${tributeId}/comments/${commentId}/like`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    },
};
