import { Router } from 'express';
import { getDb } from '../database';

const router = Router();

// How long before we re-fetch from Amazon (7 days)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Lookup product by ASIN (cache-first) ─────────────────────────────────────

router.get('/product/:asin', async (req, res) => {
  const { asin } = req.params;
  if (!asin || asin.length < 5) {
    return res.status(400).json({ error: 'Invalid ASIN' });
  }

  const db = getDb();

  // Check cache first
  const cached = db.prepare(
    'SELECT * FROM amazon_product_cache WHERE asin = ?'
  ).get(asin) as any | undefined;

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < CACHE_TTL_MS) {
      return res.json({
        found: true,
        source: 'cache',
        data: formatCachedProduct(cached),
      });
    }
  }

  // Fetch from Amazon via amazon-buddy
  try {
    const amazonData = await fetchFromAmazon(asin);
    if (!amazonData) {
      return res.json({ found: false, source: 'amazon', error: 'Product not found on Amazon' });
    }

    // Upsert into cache
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO amazon_product_cache (
        asin, title, description, brand, main_image, images, price, price_amount,
        currency, rating, reviews_count, categories, features, dimensions, weight,
        availability, is_prime, url, raw_json, fetched_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asin) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        brand = excluded.brand,
        main_image = excluded.main_image,
        images = excluded.images,
        price = excluded.price,
        price_amount = excluded.price_amount,
        currency = excluded.currency,
        rating = excluded.rating,
        reviews_count = excluded.reviews_count,
        categories = excluded.categories,
        features = excluded.features,
        dimensions = excluded.dimensions,
        weight = excluded.weight,
        availability = excluded.availability,
        is_prime = excluded.is_prime,
        url = excluded.url,
        raw_json = excluded.raw_json,
        updated_at = excluded.updated_at
    `).run(
      asin,
      amazonData.title || '',
      amazonData.description || '',
      amazonData.brand || '',
      amazonData.mainImage || '',
      JSON.stringify(amazonData.images || []),
      amazonData.price || '',
      amazonData.priceAmount || 0,
      amazonData.currency || 'USD',
      amazonData.rating || 0,
      amazonData.reviewsCount || 0,
      JSON.stringify(amazonData.categories || []),
      JSON.stringify(amazonData.features || []),
      amazonData.dimensions || '',
      amazonData.weight || '',
      amazonData.availability || '',
      amazonData.isPrime ? 1 : 0,
      amazonData.url || '',
      JSON.stringify(amazonData.raw || {}),
      cached?.fetched_at || now,
      now,
    );

    return res.json({
      found: true,
      source: 'amazon',
      data: amazonData,
    });
  } catch (err: any) {
    console.error('Amazon lookup error:', err.message);
    // If we have stale cache, return it as fallback
    if (cached) {
      return res.json({
        found: true,
        source: 'cache_stale',
        data: formatCachedProduct(cached),
      });
    }
    return res.status(500).json({ found: false, error: 'Amazon lookup failed: ' + err.message });
  }
});

// ── Bulk lookup (multiple ASINs) ─────────────────────────────────────────────

router.post('/products', async (req, res) => {
  const { asins } = req.body as { asins: string[] };
  if (!asins || !Array.isArray(asins) || asins.length === 0) {
    return res.status(400).json({ error: 'asins array is required' });
  }

  const db = getDb();
  const results: Record<string, any> = {};

  for (const asin of asins.slice(0, 10)) { // limit to 10
    const cached = db.prepare(
      'SELECT * FROM amazon_product_cache WHERE asin = ?'
    ).get(asin) as any | undefined;

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < CACHE_TTL_MS) {
        results[asin] = { found: true, source: 'cache', data: formatCachedProduct(cached) };
        continue;
      }
    }

    try {
      const amazonData = await fetchFromAmazon(asin);
      if (amazonData) {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO amazon_product_cache (
            asin, title, description, brand, main_image, images, price, price_amount,
            currency, rating, reviews_count, categories, features, dimensions, weight,
            availability, is_prime, url, raw_json, fetched_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(asin) DO UPDATE SET
            title = excluded.title, description = excluded.description, brand = excluded.brand,
            main_image = excluded.main_image, images = excluded.images, price = excluded.price,
            price_amount = excluded.price_amount, currency = excluded.currency, rating = excluded.rating,
            reviews_count = excluded.reviews_count, categories = excluded.categories,
            features = excluded.features, dimensions = excluded.dimensions, weight = excluded.weight,
            availability = excluded.availability, is_prime = excluded.is_prime, url = excluded.url,
            raw_json = excluded.raw_json, updated_at = excluded.updated_at
        `).run(
          asin, amazonData.title || '', amazonData.description || '', amazonData.brand || '',
          amazonData.mainImage || '', JSON.stringify(amazonData.images || []),
          amazonData.price || '', amazonData.priceAmount || 0, amazonData.currency || 'USD',
          amazonData.rating || 0, amazonData.reviewsCount || 0,
          JSON.stringify(amazonData.categories || []), JSON.stringify(amazonData.features || []),
          amazonData.dimensions || '', amazonData.weight || '', amazonData.availability || '',
          amazonData.isPrime ? 1 : 0, amazonData.url || '', JSON.stringify(amazonData.raw || {}),
          cached?.fetched_at || now, now,
        );
        results[asin] = { found: true, source: 'amazon', data: amazonData };
      } else {
        results[asin] = { found: false };
      }
    } catch {
      if (cached) {
        results[asin] = { found: true, source: 'cache_stale', data: formatCachedProduct(cached) };
      } else {
        results[asin] = { found: false };
      }
    }
  }

  res.json({ results });
});

// ── Cache status ─────────────────────────────────────────────────────────────

router.get('/cache-status', (_req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as total FROM amazon_product_cache').get() as { total: number };
  const recent = db.prepare(
    'SELECT asin, title, updated_at FROM amazon_product_cache ORDER BY updated_at DESC LIMIT 5'
  ).all();
  res.json({ cachedProducts: count.total, recent });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFromAmazon(asin: string) {
  // Dynamic import since amazon-buddy is CJS
  const { asin: asinLookup } = await import('amazon-buddy');

  const result = await asinLookup({ asin, number: 1 });

  if (!result || !result.result || result.result.length === 0) {
    return null;
  }

  const product = result.result[0];

  // Extract price — can be a string "$123.45", a number, or an object with nested fields
  let priceAmount = 0;
  let priceStr = '';
  if (product.price) {
    if (typeof product.price === 'string') {
      priceStr = product.price;
    } else if (typeof product.price === 'number') {
      priceAmount = product.price;
      priceStr = `$${product.price.toFixed(2)}`;
    } else if (typeof product.price === 'object') {
      // Recursively find a string or number in the price object
      const extractPrice = (obj: any): { str: string; num: number } => {
        if (!obj || typeof obj !== 'object') return { str: '', num: 0 };
        for (const key of ['current_price', 'raw', 'value', 'amount', 'price']) {
          if (typeof obj[key] === 'string' && obj[key].includes('$')) return { str: obj[key], num: 0 };
          if (typeof obj[key] === 'number') return { str: `$${obj[key].toFixed(2)}`, num: obj[key] };
        }
        // Try nested objects
        for (const val of Object.values(obj)) {
          if (typeof val === 'object' && val) {
            const r = extractPrice(val);
            if (r.str || r.num) return r;
          }
        }
        return { str: '', num: 0 };
      };
      const p = extractPrice(product.price);
      priceStr = p.str;
      priceAmount = p.num;
    }
    if (!priceAmount && priceStr) {
      const cleaned = priceStr.replace(/[^0-9.]/g, '');
      priceAmount = parseFloat(cleaned) || 0;
    }
  }

  // Rating can come as a number or empty string
  const rating = typeof product.reviews?.rating === 'number'
    ? product.reviews.rating
    : parseFloat(product.reviews?.rating) || 0;

  // Categories: amazon-buddy returns array of { category, url } objects
  const categories = Array.isArray(product.categories)
    ? product.categories.map((c: any) => typeof c === 'string' ? c : c.category || '').filter(Boolean)
    : [];

  // Features: stored as feature_bullets
  const features = product.feature_bullets || product.features || [];

  // Images: may be in various formats
  const mainImage = product.main_image || product.thumbnail || '';
  const images = Array.isArray(product.images) ? product.images : [];

  // Build normalized data
  return {
    asin,
    title: product.title || '',
    description: product.description || '',
    brand: product.brand || '',
    mainImage,
    images,
    price: priceStr,
    priceAmount,
    currency: product.currency || 'USD',
    rating,
    reviewsCount: product.reviews?.total_reviews || 0,
    categories,
    features,
    dimensions: product.dimensions || '',
    weight: product.weight || '',
    availability: typeof product.availability === 'string'
      ? product.availability
      : product.availability?.raw || '',
    isPrime: product.is_prime || false,
    url: product.url || `https://www.amazon.com/dp/${asin}`,
    raw: product,
  };
}

function formatCachedProduct(row: any) {
  return {
    asin: row.asin,
    title: row.title,
    description: row.description,
    brand: row.brand,
    mainImage: row.main_image,
    images: safeJsonParse(row.images, []),
    price: row.price,
    priceAmount: row.price_amount,
    currency: row.currency,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    categories: safeJsonParse(row.categories, []),
    features: safeJsonParse(row.features, []),
    dimensions: row.dimensions,
    weight: row.weight,
    availability: row.availability,
    isPrime: !!row.is_prime,
    url: row.url,
  };
}

function safeJsonParse(str: string, fallback: any) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default router;
