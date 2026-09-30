import axios from "axios";
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUPLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config)=> {
    const token = Cookies.get('token') || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
})

api.interceptors.response.use(
    (response) => response,
    (erorr) => {
        return Promise.reject(erorr);
    }
)