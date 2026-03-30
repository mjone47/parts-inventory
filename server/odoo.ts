// Odoo JSON-RPC client for LPN lookups and product data

interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

export interface OdooLotResult {
  lotId: number;
  lpn: string;
  productId: number;
  productName: string;
  productRef: string; // ASIN / default_code
}

export interface OdooProductResult {
  productId: number;
  name: string;
  defaultCode: string;
  barcode: string | false;
  category: string;
  description: string;
  listPrice: number;
}

class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    this.config = config;
  }

  private async jsonRpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    const res = await fetch(`${this.config.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service, method, args },
        id: Date.now(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json() as { result?: unknown; error?: { message: string; data?: { message: string } } };
    if (data.error) {
      throw new Error(data.error.data?.message || data.error.message || 'Odoo RPC error');
    }
    return data.result;
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await this.jsonRpc('common', 'authenticate', [
      this.config.db,
      this.config.username,
      this.config.apiKey,
      {},
    ]) as number;
    if (!uid) throw new Error('Odoo authentication failed');
    this.uid = uid;
    return uid;
  }

  private async execute(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<unknown> {
    const uid = await this.authenticate();
    return this.jsonRpc('object', 'execute_kw', [
      this.config.db,
      uid,
      this.config.apiKey,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  async lookupByLPN(lpn: string): Promise<OdooLotResult | null> {
    try {
      const results = await this.execute(
        'stock.lot',
        'search_read',
        [[['name', '=', lpn]]],
        { fields: ['name', 'product_id'], limit: 1 },
      ) as Array<{ id: number; name: string; product_id: [number, string] }>;

      if (!results.length) return null;

      const lot = results[0];
      const productId = lot.product_id[0];
      const productDisplay = lot.product_id[1]; // e.g. "[B01N7GO468] De'Longhi ENV150GY"

      // Parse the display name — format is "[ASIN] Product Name" or just "Product Name"
      const refMatch = productDisplay.match(/^\[([^\]]+)\]\s*(.+)$/);
      const productRef = refMatch ? refMatch[1] : '';
      const productName = refMatch ? refMatch[2] : productDisplay;

      return {
        lotId: lot.id,
        lpn: lot.name,
        productId,
        productName,
        productRef,
      };
    } catch (err) {
      console.error('Odoo LPN lookup failed:', err);
      return null;
    }
  }

  async searchByLPN(lpnQuery: string, limit = 10): Promise<OdooLotResult[]> {
    try {
      const results = await this.execute(
        'stock.lot',
        'search_read',
        [[['name', 'ilike', lpnQuery]]],
        { fields: ['name', 'product_id'], limit },
      ) as Array<{ id: number; name: string; product_id: [number, string] }>;

      return results.map((lot) => {
        const refMatch = lot.product_id[1].match(/^\[([^\]]+)\]\s*(.+)$/);
        return {
          lotId: lot.id,
          lpn: lot.name,
          productId: lot.product_id[0],
          productName: refMatch ? refMatch[2] : lot.product_id[1],
          productRef: refMatch ? refMatch[1] : '',
        };
      });
    } catch (err) {
      console.error('Odoo LPN search failed:', err);
      return [];
    }
  }

  async getProduct(productId: number): Promise<OdooProductResult | null> {
    try {
      const results = await this.execute(
        'product.product',
        'read',
        [[productId]],
        { fields: ['name', 'default_code', 'barcode', 'categ_id', 'description', 'list_price'] },
      ) as Array<{
        id: number;
        name: string;
        default_code: string | false;
        barcode: string | false;
        categ_id: [number, string] | false;
        description: string | false;
        list_price: number;
      }>;

      if (!results.length) return null;
      const p = results[0];

      // Parse category — format is "All / Amazon Products / Category Name"
      let category = '';
      if (p.categ_id) {
        const parts = (p.categ_id[1] as string).split(' / ');
        category = parts[parts.length - 1];
      }

      return {
        productId: p.id,
        name: p.name,
        defaultCode: p.default_code || '',
        barcode: p.barcode,
        category,
        description: p.description || '',
        listPrice: p.list_price,
      };
    } catch (err) {
      console.error('Odoo product lookup failed:', err);
      return null;
    }
  }

  async searchProducts(query: string, limit = 10): Promise<OdooProductResult[]> {
    try {
      const results = await this.execute(
        'product.product',
        'search_read',
        [[['|', '|', ['name', 'ilike', query], ['default_code', 'ilike', query], ['barcode', 'ilike', query]]]],
        { fields: ['name', 'default_code', 'barcode', 'categ_id', 'description', 'list_price'], limit },
      ) as Array<{
        id: number;
        name: string;
        default_code: string | false;
        barcode: string | false;
        categ_id: [number, string] | false;
        description: string | false;
        list_price: number;
      }>;

      return results.map((p) => {
        let category = '';
        if (p.categ_id) {
          const parts = (p.categ_id[1] as string).split(' / ');
          category = parts[parts.length - 1];
        }
        return {
          productId: p.id,
          name: p.name,
          defaultCode: p.default_code || '',
          barcode: p.barcode,
          category,
          description: p.description || '',
          listPrice: p.list_price,
        };
      });
    } catch (err) {
      console.error('Odoo product search failed:', err);
      return [];
    }
  }
}

// Singleton instance
let client: OdooClient | null = null;

export function getOdooClient(): OdooClient | null {
  if (client) return client;

  const url = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;

  if (!url || !db || !username || !apiKey) {
    console.warn('Odoo environment variables not configured — LPN lookups disabled');
    return null;
  }

  client = new OdooClient({ url, db, username, apiKey });
  return client;
}
