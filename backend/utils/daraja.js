// services/daraja.js
const axios = require("axios");
require("dotenv").config();

/* =====================================================
   HELPERS
===================================================== */
function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildPassword(shortCode, passkey, timestamp) {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

/* =====================================================
   ACCESS TOKEN
===================================================== */
async function getAccessToken() {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;

    if (!key || !secret) {
        throw new Error("Missing M-Pesa consumer key/secret");
    }

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");

    const url =
        process.env.MPESA_ENV === "production"
            ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
            : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const resp = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 15000,
    });

    return resp.data.access_token;
}

/* =====================================================
   STK PUSH
===================================================== */
async function stkPush({
    amount,
    phone, // MUST be 2547XXXXXXXX
    shortCode,
    passkey,
    callbackUrl,
    accountReference,
    transactionDesc,
}) {
    const token = await getAccessToken();
    const timestamp = nowTimestamp();

    const url =
        process.env.MPESA_ENV === "production"
            ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
            : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const resp = await axios.post(
        url,
        {
            BusinessShortCode: String(shortCode),
            Password: buildPassword(shortCode, passkey, timestamp),
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.round(Number(amount)),
            PartyA: phone,
            PartyB: String(shortCode),
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc || "Asiyo Savings",
        },
        {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 20000,
        }
    );

    return resp.data;
}

/* =====================================================
   STK QUERY
===================================================== */
async function stkQuery({ shortCode, passkey, checkoutRequestId }) {
    const token = await getAccessToken();
    const timestamp = nowTimestamp();

    const url =
        process.env.MPESA_ENV === "production"
            ? "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
            : "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";

    const resp = await axios.post(
        url,
        {
            BusinessShortCode: String(shortCode),
            Password: buildPassword(shortCode, passkey, timestamp),
            Timestamp: timestamp,
            CheckoutRequestID: String(checkoutRequestId),
        },
        {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 20000,
        }
    );

    return resp.data;
}

/* =====================================================
   🔁 AUTOMATIC FALLBACK (INTERNAL)
===================================================== */
/**
 * This function:
 * - Runs after STK push
 * - Checks status via stkQuery
 * - Applies payment if callback never arrived
 */
/* =====================================================
   🔁 AUTOMATIC FALLBACK (SAFE + FAST)
===================================================== */
async function autoFallback(
    intentId,
    {
        initialDelayMs = 30_000,   // ✅ wait 12s (let callback arrive)
        retryIntervalMs = 45_000,  // ✅ safe Daraja interval
        maxAttempts = 2            // ✅ stay well under rate limit
    } = {}
) {
    let attempts = 0;

    const run = async () => {
        try {
            const PaymentIntent = require("../models/PaymentIntent");
            const SavingsPod = require("../models/SavingsPod");

            const intent = await PaymentIntent.findOne({ intentId });

            // 🛑 Stop if not eligible
            if (!intent) return;
            if (intent.applied) return;
            if (!intent.checkoutRequestId) return;
            if (intent.status !== "PENDING") return;
            if (attempts >= maxAttempts) return;

            attempts++;

            console.log(`⏳ FALLBACK QUERY (${attempts}/${maxAttempts}):`, intent.intentId);

            const q = await stkQuery({
                shortCode: intent.paybillShortCode,
                passkey: process.env.MPESA_PASSKEY,
                checkoutRequestId: intent.checkoutRequestId,
            });

            // ✅ Payment confirmed
            if (String(q.ResultCode) === "0") {
                intent.status = "COMPLETED";
                intent.applied = true;
                intent.resultCode = 0;
                intent.resultDesc = "Confirmed via STK Query fallback";
                intent.confirmationMethod = "FALLBACK";

                // ⚠️ No official receipt via STK query
                intent.mpesaReceiptNumber = null;

                const pod = await SavingsPod.findById(intent.podId);
                if (pod) {
                    pod.addContribution(intent.userId, intent.amount, "mpesa");
                    const last = pod.contributions[pod.contributions.length - 1];
                    if (last) last.transactionId = intent.checkoutRequestId;
                    await pod.save();
                }

                await intent.save();
                console.log("✅ PAYMENT CONFIRMED VIA FALLBACK:", intent.intentId);
                return;
            }

            // 🔁 Try once more later
            setTimeout(run, retryIntervalMs);

        } catch (err) {
            const e = err?.response?.data || err.message;

            if (String(e).includes("Spike arrest")) {
                console.warn("⚠️ Spike arrest detected — aborting fallback for safety");
                return; // 🚫 STOP completely
            }

            console.error("❌ FALLBACK ERROR:", e);
        }
    };

    // ⏱ Start safely
    setTimeout(run, initialDelayMs);
}

module.exports = {
    stkPush,
    stkQuery,
    autoFallback, // 👈 export fallback
};
