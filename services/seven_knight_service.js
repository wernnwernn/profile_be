// services/seven_knight_service.js
const axios = require("axios");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shouldRetry = (status) => status === 429 || (status >= 500 && status <= 599);

function normalizeStr(v) {
  return String(v ?? "").trim();
}

async function callStep1Reward({ uid, coupon_code }) {
  const baseURL = process.env.COUPON_BASE_URL; 
  const step1Path = process.env.COUPON_STEP1_PATH; 

  if (!baseURL || !step1Path) throw new Error("Missing COUPON_BASE_URL / COUPON_STEP1_PATH in .env");

  const res = await axios.get(`${baseURL}${step1Path}`, {
    params: {
      pid: normalizeStr(uid),
      couponCode: normalizeStr(coupon_code),
      langCd: process.env.LANG_CD || "TH_TH",
      gameCode: process.env.GAME_CODE || "tskgb",
    },
    timeout: 15000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const err = new Error("Step1 External API error");
    err.statusCode = res.status;
    err.payload = res.data;
    throw err;
  }

  return res.data;
}

async function callStep2Confirm({ uid, coupon_code }) {
  const baseURL = process.env.COUPON_BASE_URL; 
  const step2Path = process.env.COUPON_STEP2_PATH; 

  if (!baseURL || !step2Path) throw new Error("Missing COUPON_BASE_URL / COUPON_STEP2_PATH in .env");

  const body = {
    pid: normalizeStr(uid),
    couponCode: normalizeStr(coupon_code),
    langCd: process.env.LANG_CD || "TH_TH",
    gameCode: process.env.GAME_CODE || "tskgb",
  };

  const res = await axios.post(`${baseURL}${step2Path}`, body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    timeout: 15000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const err = new Error("Step2 External API error");
    err.statusCode = res.status;
    err.payload = res.data;
    throw err;
  }

  return res.data;
}

async function callWithRetry(fn, payload, { maxRetry = 2, baseDelayMs = 400 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn(payload);
    } catch (err) {
      const status = err?.statusCode || err?.response?.status || 0;
      if (attempt >= maxRetry || !shouldRetry(status)) throw err;
      await sleep(baseDelayMs * Math.pow(2, attempt));
      attempt++;
    }
  }
}

const redeemCoupon = async (payload) => {
  const uids = Array.isArray(payload?.uid) ? payload.uid : [];
  const coupons = Array.isArray(payload?.coupon_code) ? payload.coupon_code : [];

  if (!uids.length || !coupons.length) {
    const err = new Error("uid และ coupon_code ต้องเป็น array และห้ามว่าง");
    err.statusCode = 400;
    throw err;
  }

  const pairs = [];
  for (let i = 0; i < uids.length; i++) {
    for (let j = 0; j < coupons.length; j++) {
      pairs.push({ uid: uids[i], coupon_code: coupons[j] });
    }
  }

  const MAX_PAIRS = Number(process.env.MAX_PAIRS || 500);
  if (pairs.length > MAX_PAIRS) {
    const err = new Error(`จำนวนคู่มากเกินไป (${pairs.length}) limit=${MAX_PAIRS}`);
    err.statusCode = 400;
    throw err;
  }

  const CONCURRENCY = Number(process.env.CONCURRENCY || 3);

  const results = new Array(pairs.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= pairs.length) break;

      const item = pairs[idx];

      try {
        const step1Body = await callWithRetry(callStep1Reward, item, { maxRetry: 2, baseDelayMs: 400 });

        const shouldCallStep2 = step1Body?.errorCode === 200;

        let step2Body = null;
        let step2Ok = false;

        if (shouldCallStep2) {
          step2Body = await callWithRetry(callStep2Confirm, item, { maxRetry: 2, baseDelayMs: 400 });
          step2Ok = true;
        }

        results[idx] = {
          index: idx,
          ok: true, // ok แปลว่า “Step1 สำเร็จ” (และ Step2 ถ้ามี ก็ยิงแล้ว)
          uid: normalizeStr(item.uid),
          coupon_code: normalizeStr(item.coupon_code),
          step1: step1Body,
          step2: shouldCallStep2 ? step2Body : { skipped: true, reason: "step1.errorCode != 200" },
          step2Ok,
        };
      } catch (err) {
        results[idx] = {
          index: idx,
          ok: false,
          uid: normalizeStr(item.uid),
          coupon_code: normalizeStr(item.coupon_code),
          statusCode: err?.statusCode || 500,
          error: err?.payload || err?.message || "unknown error",
        };
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return {
    totalPairs: pairs.length,
    success: results.filter((r) => r?.ok).length,
    failed: results.filter((r) => r && !r.ok).length,
    results,
  };
};

module.exports = { redeemCoupon };
