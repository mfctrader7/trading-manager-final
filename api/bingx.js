// api/bingx.js — Vercel Serverless Function
import crypto from 'crypto';

const BINGX_API_KEY = process.env.BINGX_API_KEY;
const BINGX_SECRET  = process.env.BINGX_SECRET;
const BINGX_BASE    = process.env.BINGX_BASE || 'https://open-api-vst.bingx.com';

function sign(qs) {
    return crypto.createHmac('sha256', BINGX_SECRET).update(qs).digest('hex');
}

function buildQs(params) {
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys.map(k => `${k}=${String(params[k])}`).join('&');
}

async function bingxRequest(method, path, params = {}) {
    const allParams = { ...params, timestamp: Date.now().toString() };
    const qs = buildQs(allParams);
    const signature = sign(qs);
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
    const rawText = await response.text();
    // Preserve large integer precision
    return rawText.replace(/"orderId"\s*:\s*(\d{15,})/g, '"orderId":"$1"');
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

        // Special action: cancel all TPs for a symbol+side server-side
        if (path === '/__cancelTPs') {
            const { symbol, positionSide } = restParams;
            // Fetch open orders
            const ordersRaw = await bingxRequest('GET', '/openApi/swap/v2/trade/openOrders', { symbol });
            const ordersText = ordersRaw.replace(/"orderId":"(\d+)"/g, '"orderId":"$1"');
            const ordersData = JSON.parse(ordersText);
            const orders = ordersData?.data?.orders || [];
            const tpOrders = orders.filter(o =>
                (o.type === 'TAKE_PROFIT_MARKET' || o.type === 'TAKE_PROFIT') &&
                (!positionSide || o.positionSide === positionSide)
            );
            // Cancel each one server-side (orderId never touches JS number parsing)
            const results = [];
            for (const order of tpOrders) {
                await new Promise(r => setTimeout(r, 300));
                const cancelRaw = await bingxRequest('DELETE', '/openApi/swap/v2/trade/order', {
                    symbol,
                    orderId: order.orderId // already a string from our regex
                });
                results.push(JSON.parse(cancelRaw));
            }
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify({ code: 0, cancelled: results.length }));
            return;
        }

        // Normal proxy
        const rawText = await bingxRequest(method, path, restParams);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(rawText);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
