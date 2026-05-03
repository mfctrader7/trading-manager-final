// api/bingx-public.js — Vercel Serverless Function
// Public BingX API proxy — no authentication required
// Uses open-api.bingx.com (real market data, not paper trading)

const BINGX_PUBLIC_BASE = 'https://open-api.bingx.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { path, ...params } = req.method === 'POST' ? req.body : req.query;
        if (!path) { res.status(400).json({ error: 'Missing path' }); return; }

        const qs = Object.keys(params).length > 0
            ? '?' + Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
            : '';

        const url = `${BINGX_PUBLIC_BASE}${path}${qs}`;
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
