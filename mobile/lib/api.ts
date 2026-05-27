import { Platform } from 'react-native';

// On device/simulator, point at your Replit dev domain.
// Replace with your actual deployed URL (e.g. https://neonadai.com) when in production.
const DEV_HOST =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://localhost:5000';

export const API_BASE = __DEV__ ? DEV_HOST : 'https://neonadai.com';

let sessionCookie = '';

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) sessionCookie = match[0];
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  me: () => apiRequest<any>('GET', '/api/auth/me'),
  login: (email: string, password: string) =>
    apiRequest<any>('POST', '/api/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    apiRequest<any>('POST', '/api/auth/register', { name, email, password }),
  logout: () => apiRequest<any>('POST', '/api/auth/logout'),

  // Dashboard
  stats: () => apiRequest<any>('GET', '/api/dashboard/stats'),

  // Brands
  brands: () => apiRequest<any>('GET', '/api/brands'),

  // Creatives
  creatives: () => apiRequest<any>('GET', '/api/creatives'),
  creative: (id: number) => apiRequest<any>('GET', `/api/creatives/${id}`),
  generateCreative: (data: any) =>
    apiRequest<any>('POST', '/api/creatives/generate', data),
  deleteCreative: (id: number) =>
    apiRequest<any>('DELETE', `/api/creatives/${id}`),

  // Copilot
  copilotAsk: (question: string) =>
    apiRequest<any>('POST', '/api/copilot/ask', { question }),

  // Campaigns
  campaigns: () => apiRequest<any>('GET', '/api/campaigns'),
  createCampaign: (data: any) =>
    apiRequest<any>('POST', '/api/campaigns', data),
};
