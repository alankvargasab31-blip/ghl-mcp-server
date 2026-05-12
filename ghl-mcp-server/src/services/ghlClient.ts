import axios, { AxiosInstance } from "axios";

export const GHL_BASE_URL = "https://services.leadconnectorhq.com";
export const GHL_API_VERSION = "2021-07-28";

export function createGHLClient(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: GHL_BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 15000,
  });
}

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    if (status === 401) return `Error de autenticación: API Key inválida o sin permisos. ${message}`;
    if (status === 404) return `Recurso no encontrado. ${message}`;
    if (status === 422) return `Datos inválidos: ${message}`;
    if (status === 429) return `Límite de solicitudes alcanzado. Intenta de nuevo en unos segundos.`;
    return `Error de API (${status}): ${message}`;
  }
  return `Error inesperado: ${String(error)}`;
}
