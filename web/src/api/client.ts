import axios from 'axios';
import type { ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const apiClient = api;

export const handleApiResponse = <T>(response: { data: ApiResponse<T> }): ApiResponse<T> => {
  return response.data;
};
