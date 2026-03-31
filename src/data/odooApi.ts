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

// ── Amazon product enrichment ────────────────────────────────────────────────

export interface AmazonProductData {
  asin: string;
  title: string;
  description: string;
  brand: string;
  mainImage: string;
  images: string[];
  price: string;
  priceAmount: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  categories: string[];
  features: string[];
  dimensions: string;
  weight: string;
  availability: string;
  isPrime: boolean;
  url: string;
}

export interface AmazonLookupResult {
  found: boolean;
  source?: 'cache' | 'amazon' | 'cache_stale';
  data?: AmazonProductData;
  error?: string;
}

export async function lookupAmazonProduct(asin: string): Promise<AmazonLookupResult> {
  try {
    const res = await fetch(`/api/amazon/product/${encodeURIComponent(asin)}`);
    if (!res.ok) throw new Error(`Amazon API failed: ${res.status}`);
    return res.json();
  } catch {
    return { found: false, error: 'Amazon lookup unavailable' };
  }
}
