// api/cmc.js — CoinMarketCap proxy
const CMC_API_KEY = 'c270a5d7d8e74affab4bb760306c6c9d';
const CMC_BASE = 'https://pro-api.coinmarketcap.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { path, ...params } = req.query;
        if (!path) { res.status(400).json({ error: 'Missing path' }); return; }
        const qs = Object.keys(params).length > 0
            ? '?' + Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
            : '';
        const url = `${CMC_BASE}${path}${qs}`;
        const response = await fetch(url, {
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
