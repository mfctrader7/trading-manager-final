// api/bingx-real.js — Vercel Serverless Function
// BingX real account — read-only (withdrawals history)

import crypto from 'crypto';

const API_KEY = process.env.BINGX_REAL_API_KEY;
const SECRET  = process.env.BINGX_REAL_SECRET;
const BASE    = 'https://open-api.bingx.com';

function sign(qs) {
    return crypto.createHmac('sha256', SECRET).update(qs).digest('hex');
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

        const params = { ...restParams, timestamp: Date.now().toString() };
        const sortedKeys = Object.keys(params).sort();
        const qs = sortedKeys.map(k => `${k}=${String(params[k])}`).join('&');
        const signature = sign(qs);
        const finalQs = qs + '&signature=' + signature;

        const url = `${BASE}${path}?${finalQs}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-BX-APIKEY': API_KEY }
        });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
