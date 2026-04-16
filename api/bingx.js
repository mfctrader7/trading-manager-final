// api/bingx.js — Vercel Serverless Function
// Proxy seguro para BingX. Las API keys están en variables de entorno de Vercel.

import crypto from 'crypto';

const BINGX_API_KEY = process.env.BINGX_API_KEY;
const BINGX_SECRET  = process.env.BINGX_SECRET;
const BINGX_BASE    = process.env.BINGX_BASE || 'https://open-api-vst.bingx.com';

function sign(params) {
    const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return crypto.createHmac('sha256', BINGX_SECRET).update(qs).digest('hex');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const body = req.method === 'POST' ? req.body : req.query;
        const { path, method = 'GET', ...restParams } = body;

        if (!path) { res.status(400).json({ error: 'Missing path' }); return; }

        // Agregar timestamp y firma
        const params = { ...restParams, timestamp: Date.now().toString() };
        const signature = sign(params);
        const qs = Object.keys(params)
            .map(k => `${k}=${encodeURIComponent(params[k])}`)
            .join('&') + `&signature=${signature}`;

        const url  = method === 'GET'
            ? `${BINGX_BASE}${path}?${qs}`
            : `${BINGX_BASE}${path}`;

        const opts = {
            method,
            headers: { 'X-BX-APIKEY': BINGX_API_KEY }
        };
        if (method === 'POST') {
            opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            opts.body = qs;
        }

        const response = await fetch(url, opts);
        const data     = await response.json();
        res.status(200).json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
