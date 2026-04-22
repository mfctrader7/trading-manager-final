// api/bingx.js — Vercel Serverless Function
import crypto from 'crypto';

const BINGX_API_KEY = process.env.BINGX_API_KEY;
const BINGX_SECRET  = process.env.BINGX_SECRET;
const BINGX_BASE    = process.env.BINGX_BASE || 'https://open-api-vst.bingx.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    try {
        const body = req.method === 'POST' ? req.body : req.query;
        const { path, method = 'GET', ...restParams } = body;
        if (!path) { res.status(400).json({ error: 'Missing path' }); return; }

        // Add timestamp
        const params = { ...restParams, timestamp: Date.now().toString() };

        // Build querystring with sorted keys (required by BingX for signature)
        const sortedKeys = Object.keys(params).sort();
        const qs = sortedKeys.map(k => `${k}=${String(params[k])}`).join('&');

        // Sign the sorted querystring
        const signature = crypto.createHmac('sha256', BINGX_SECRET).update(qs).digest('hex');

        // Final querystring with signature appended
        const finalQs = qs + '&signature=' + signature;

       const url = (method === 'GET' || method === 'DELETE')
    ? `${BINGX_BASE}${path}?${finalQs}`
    : `${BINGX_BASE}${path}`;

        const opts = { method, headers: { 'X-BX-APIKEY': BINGX_API_KEY } };
        if (method === 'POST') {
            opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            opts.body = finalQs;
        }

        const response = await fetch(url, opts);
        const data = await response.json();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
