// api/binance.js — Vercel Serverless Function (public endpoints only)
const BINANCE_BASE = 'https://api.binance.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { path, ...params } = req.query;
        if (!path) { res.status(400).json({ error: 'Missing path' }); return; }
        const qs = new URLSearchParams(params).toString();
        const url = `${BINANCE_BASE}${path}${qs ? '?' + qs : ''}`;
        const response = await fetch(url);
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
