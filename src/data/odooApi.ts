import type { OdooLPNLookupResult } from '../types';

const API = '/api/odoo';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function lookupLPN(lpn: string): Promise<OdooLPNLookupResult> {
  return fetchJson(`/lpn/${encodeURIComponent(lpn)}`);
}

export async function saveLPNRecord(data: {
  lpn: string;
  productId?: string;
  odooLotId?: number;
  odooProductId?: number;
  odooProductName?: string;
  odooProductRef?: string;
  notes?: string;
}) {
  const res = await fetch(`${API}/lpn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Save LPN failed: ${res.status}`);
  return res.json();
}

export async function checkOdooHealth(): Promise<{ connected: boolean }> {
  try {
    return await fetchJson('/health');
  } catch {
    return { connected: false };
  }
}
