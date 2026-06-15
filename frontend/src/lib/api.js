import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const importKml = (url) => api.post("/import-kml", { url }).then((r) => r.data);
export const fetchCategories = () => api.get("/categories").then((r) => r.data);
export const optimizeRoute = (payload) => api.post("/optimize-route", payload).then((r) => r.data);
export const saveItinerary = (payload) => api.post("/itineraries", payload).then((r) => r.data);
export const listItineraries = () => api.get("/itineraries").then((r) => r.data);
export const getItinerary = (id) => api.get(`/itineraries/${id}`).then((r) => r.data);
export const deleteItinerary = (id) => api.delete(`/itineraries/${id}`).then((r) => r.data);
