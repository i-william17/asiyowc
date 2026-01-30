const router = require("express").Router();
const crypto = require("crypto");
const PaymentIntent = require("../models/PaymentIntent");
const SavingsPod = require("../models/SavingsPod");
const { stkPush, stkQuery, autoFallback } = require("../utils/daraja"); // ✅ added stkQuery (non-breaking)

/* =====================================================
   HOSTED CHECKOUT PAGE
===================================================== */
router.get("/checkout/:intentId", async (req, res) => {
    const intent = await PaymentIntent.findOne({ intentId: req.params.intentId }).lean();
    if (!intent) return res.status(404).send("Checkout not found");

    // ✅ If already paid, send to web return (works in browser) + keeps app deep link possible
    if (intent.status === "COMPLETED") {
        const returnUrl = process.env.APP_RETURN_WEB_URL || process.env.APP_RETURN_URL;
        return res.redirect(`${returnUrl}?intentId=${intent.intentId}`);
    }

    // 🔐 CSP NONCE
    const nonce = crypto.randomBytes(16).toString("base64");

    res.setHeader(
        "Content-Security-Policy",
        `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}';
      style-src 'self' 'unsafe-inline';
      connect-src 'self';
      img-src 'self' data:;
      frame-ancestors *;
    `.replace(/\s+/g, " ").trim()
    );

    res.setHeader("Content-Type", "text/html");

    res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Asiyo Pay</title>

<style>
:root{
  --primary:#6A1B9A;
  --bg:#f4f6fb;
  --card:#ffffff;
  --muted:#6b7280;
  --success:#16a34a;
  --danger:#dc2626;
}

*{box-sizing:border-box}
body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;
  background:var(--bg);
  color:#111827;
}

.wrapper{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}

.card{
  width:100%;
  max-width:420px;
  background:var(--card);
  border-radius:16px;
  padding:22px;
  box-shadow:0 20px 40px rgba(0,0,0,.08);
}

.brand{
  font-weight:800;
  color:var(--primary);
  font-size:20px;
  margin-bottom:4px;
}

.subtitle{
  color:var(--muted);
  font-size:14px;
  margin-bottom:20px;
}

label{
  font-size:13px;
  color:var(--muted);
  display:block;
  margin-top:14px;
}

input{
  width:100%;
  padding:14px;
  margin-top:6px;
  border-radius:10px;
  border:1px solid #e5e7eb;
  font-size:15px;
}

input:focus{
  outline:none;
  border-color:var(--primary);
}

button{
  margin-top:12px;
  width:100%;
  border:none;
  border-radius:12px;
  padding:14px;
  font-size:16px;
  font-weight:700;
  background:var(--primary);
  color:white;
  cursor:pointer;
}

button:disabled{
  opacity:.6;
  cursor:not-allowed;
}

.secondary{
  background:#111827;
}

.ghost{
  background:#ffffff;
  color:#111827;
  border:1px solid #e5e7eb;
}

.msg{
  margin-top:14px;
  font-size:14px;
  color:var(--muted);
  text-align:center;
}

.msg.success{color:var(--success)}
.msg.error{color:var(--danger)}

.divider{
  margin:22px 0;
  border-top:1px dashed #e5e7eb;
}

.manual{
  background:#fafafa;
  border-radius:12px;
  padding:14px;
  font-size:14px;
  color:#374151;
}
.manual b{color:#111827}

.badge{
  display:inline-block;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  background:#f3f4f6;
  color:#111827;
}

.successBox{
  display:none;
  text-align:center;
  margin-top:16px;
  padding:14px;
  border-radius:12px;
  background:#ecfdf5;
  border:1px solid #bbf7d0;
}

.check{
  width:56px;
  height:56px;
  border-radius:50%;
  margin:0 auto 10px auto;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#16a34a;
  color:white;
  font-size:28px;
  font-weight:900;
}

.small{
  font-size:12px;
  color:var(--muted);
  margin-top:6px;
}
</style>
</head>

<body>
<div class="wrapper">
  <div class="card">

  <div style="text-align:center;margin-bottom:16px">
  <img 
    src="/assets/logo.png"
    alt="Asiyo"
    style="height:100px;object-fit:contain"
  />
</div>

    <div class="brand">Asiyo Pay</div>
    <div class="subtitle">Secure savings contribution</div>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <span class="badge">M-Pesa Paybill</span>
      <span class="badge">Savings</span>
    </div>

    <label>Amount (KES)</label>
    <input id="amount" type="number" min="1" placeholder="e.g. 1000"/>

    <label>M-Pesa Phone Number</label>
    <input id="phone" placeholder="07XXXXXXXX"/>

    <button id="payBtn">Proceed to Pay</button>

    <!-- ✅ Retry button (requested) -->
    <button id="retryBtn" class="ghost" style="display:none">Retry STK Prompt</button>

    <!-- ✅ Manual pay "I already paid" check button -->
    <button id="manualCheckBtn" class="secondary" style="display:none">I have paid manually — Check status</button>

    <div id="msg" class="msg"></div>

    <!-- ✅ Success UI -->
    <div id="successBox" class="successBox">
      <div class="check">✓</div>
      <div style="font-weight:800;color:var(--success)">Payment Successful</div>
      <div class="small">Your contribution has been saved.</div>
    </div>

    <div class="divider"></div>

    <div class="manual">
      <div><b>Pay manually via M-Pesa</b></div>
      <div>Paybill: <b>${intent.paybillShortCode}</b></div>
      <div>Account: <b>${intent.accountReference}</b></div>
      <div style="margin-top:6px;color:var(--muted)">
        Use this option if STK does not prompt.
      </div>
    </div>

  </div>
</div>

<script nonce="${nonce}">
const intentId = "${intent.intentId}";
const btn = document.getElementById("payBtn");
const retryBtn = document.getElementById("retryBtn");
const manualCheckBtn = document.getElementById("manualCheckBtn");
const msg = document.getElementById("msg");
const successBox = document.getElementById("successBox");

let lastPayload = null;
let pollTimer = null;

function normalizePhone(v){
  const d = (v||"").replace(/\\D/g,"");
  if(d.startsWith("0")) return "+254"+d.slice(1);
  if(d.startsWith("7")) return "+254"+d;
  if(d.startsWith("254")) return "+"+d;
  if(d.startsWith("+254")) return d;
  return null;
}

function setMessage(text, type){
  msg.className = "msg" + (type ? " " + type : "");
  msg.innerText = text || "";
}

function setButtons(state){
  // state: IDLE | SENDING | PENDING | COMPLETED | FAILED
  if(state === "IDLE"){
    btn.disabled = false;
    retryBtn.style.display = "none";
    manualCheckBtn.style.display = "none";
    successBox.style.display = "none";
  }
  if(state === "SENDING"){
    btn.disabled = true;
    retryBtn.style.display = "none";
    manualCheckBtn.style.display = "none";
    successBox.style.display = "none";
  }
  if(state === "PENDING"){
    btn.disabled = true;
    retryBtn.style.display = "block";
    manualCheckBtn.style.display = "block";
    successBox.style.display = "none";
  }
  if(state === "FAILED"){
    btn.disabled = false;
    retryBtn.style.display = "block";
    manualCheckBtn.style.display = "block";
    successBox.style.display = "none";
  }
  if(state === "COMPLETED"){
    btn.disabled = true;
    retryBtn.style.display = "none";
    manualCheckBtn.style.display = "none";
    successBox.style.display = "block";
  }
}

async function getStatus(){
  const r = await fetch("/api/payments/checkout/" + intentId + "/status", { method:"GET" });
  const d = await r.json();
  return d;
}

function startPolling(){
  if(pollTimer) return;
  pollTimer = setInterval(async () => {
    try{
      const s = await getStatus();
      if(s.status === "COMPLETED"){
        clearInterval(pollTimer);
        pollTimer = null;
        setButtons("COMPLETED");
        setMessage("✔ Payment confirmed.", "success");

        // ✅ redirect back to web return (works in browser), app deep link can be handled by your app from that page
        const returnUrl = ${JSON.stringify(process.env.APP_RETURN_WEB_URL || "")};
        if(returnUrl){
          setTimeout(() => {
            window.location.href = returnUrl + "?intentId=" + encodeURIComponent(intentId);
          }, 1200);
        }
      }else if(s.status === "FAILED"){
        setButtons("FAILED");
        setMessage("Payment failed or was cancelled. You can retry.", "error");
      }else if(s.status === "PENDING"){
        setButtons("PENDING");
      }
    }catch(e){}
  }, 2500);
}

async function initiate(payload){
  setButtons("SENDING");
  setMessage("Sending STK prompt…");
  try{
    const r = await fetch("/api/payments/checkout/" + intentId + "/initiate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const d = await r.json();

    if(!r.ok){
      setButtons("FAILED");
      setMessage(d.message || "Failed to initiate. Retry.", "error");
      return;
    }

    lastPayload = payload;
    setButtons("PENDING");
    setMessage(d.message || "STK sent. Enter your PIN.", "");
    startPolling();
  }catch(e){
    setButtons("FAILED");
    setMessage("Failed to initiate payment. Please retry.", "error");
  }
}

btn.addEventListener("click", async () => {
  const amount = Number(document.getElementById("amount").value);
  const phone = normalizePhone(document.getElementById("phone").value);

  if(!amount || amount <= 0 || !phone){
    setMessage("Enter a valid amount and phone number.", "error");
    return;
  }

  await initiate({ amount, phone });
});

retryBtn.addEventListener("click", async () => {
  // ✅ Retry uses last payload if present; otherwise reads inputs again
  let payload = lastPayload;
  if(!payload){
    const amount = Number(document.getElementById("amount").value);
    const phone = normalizePhone(document.getElementById("phone").value);
    if(!amount || amount <= 0 || !phone){
      setMessage("Enter a valid amount and phone number.", "error");
      return;
    }
    payload = { amount, phone };
  }
  await initiate(payload);
});

manualCheckBtn.addEventListener("click", async () => {
  setMessage("Checking payment status…");

  try {
    const r = await fetch(
      "/api/payments/checkout/" + intentId + "/refresh",
      { method: "POST" }
    );

    const d = await r.json();

    if (d.status === "COMPLETED") {
      setButtons("COMPLETED");
      setMessage("✔ Payment confirmed.", "success");
      return;
    }

    setMessage("Payment not confirmed yet. Please wait a moment.", "");

  } catch (e) {
    setMessage("Unable to check status right now.", "error");
  }
});

// ✅ On page load, if intent is already PENDING, start polling (handles refresh)
(async function boot(){
  try{
    const s = await getStatus();
    if(s.status === "COMPLETED"){
      setButtons("COMPLETED");
      setMessage("✔ Payment confirmed.", "success");
      return;
    }
    if(s.status === "PENDING"){
      setButtons("PENDING");
      setMessage("Waiting for confirmation…");
      startPolling();
      return;
    }
    setButtons("IDLE");
  }catch(e){
    setButtons("IDLE");
  }
})();
</script>

</body>
</html>`);
});

/* =====================================================
   INITIATE STK PUSH
===================================================== */
router.post("/checkout/:intentId/initiate", async (req, res) => {
    try {
        const { amount, phone: rawPhone } = req.body;

        console.log("INITIATE STK:", { amount, rawPhone });

        const intent = await PaymentIntent.findOne({ intentId: req.params.intentId });
        if (!intent) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        if (!rawPhone) {
            return res.status(400).json({ message: "Phone number required" });
        }

        // Normalize Kenyan phone number safely
        const digits = String(rawPhone).replace(/\D/g, "");

        // Accept: 07XXXXXXXX | 7XXXXXXXX | 2547XXXXXXXX | +2547XXXXXXXX
        let phone;

        if (digits.startsWith("2547") && digits.length === 12) {
            phone = digits;
        } else if (digits.startsWith("7") && digits.length === 9) {
            phone = "254" + digits;
        } else if (digits.startsWith("07") && digits.length === 10) {
            phone = "254" + digits.slice(1);
        } else {
            return res.status(400).json({ message: "Invalid Kenyan phone number" });
        }

        const callbackUrl =
            `${process.env.API_PUBLIC_BASE_URL}/api/payments/mpesa/callback`;

        const stk = await stkPush({
            amount: Math.round(Number(amount)),
            phone, // ✅ 2547XXXXXXXX
            shortCode: intent.paybillShortCode,
            passkey: process.env.MPESA_PASSKEY,
            callbackUrl,
            accountReference: intent.accountReference,
            transactionDesc: "Asiyo Savings Contribution",
        });

        intent.amount = Number(amount);
        intent.phone = `+${phone}`; // store prettified version
        intent.status = "PENDING";
        intent.checkoutRequestId = stk.CheckoutRequestID;
        intent.merchantRequestId = stk.MerchantRequestID;

        await intent.save();

        /* 🔁 AUTOMATIC FALLBACK */
        autoFallback(intent.intentId);

        return res.json({
            message: "STK sent. Enter your PIN to confirm.",
            status: "PENDING",
        });

    } catch (err) {
        console.error("❌ STK INITIATE ERROR");
        console.error(err?.response?.data || err.message);

        return res.status(500).json({
            message: "Failed to initiate M-Pesa STK Push",
            error: err?.response?.data || err.message,
        });
    }
});

/* =====================================================
   CHECKOUT STATUS (POLLING)
===================================================== */
router.get("/checkout/:intentId/status", async (req, res) => {
    const intent = await PaymentIntent.findOne({ intentId: req.params.intentId }).lean();
    if (!intent) return res.status(404).json({ status: "NOT_FOUND" });

    return res.json({
        status: intent.status,
        intentId: intent.intentId,
        applied: intent.applied,
        mpesaReceiptNumber: intent.mpesaReceiptNumber || null,
        confirmationMethod: intent.confirmationMethod || null,
    });
});

/* =====================================================
   OPTIONAL: FORCE QUERY TO DARAJA (IF CALLBACK DELAYS)
   - Useful when callback didn't arrive but STK was paid
===================================================== */
router.post("/checkout/:intentId/refresh", async (req, res) => {
    try {
        const intent = await PaymentIntent.findOne({ intentId: req.params.intentId });

        if (!intent) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        // 🛑 Already resolved → do not hit Daraja again
        if (intent.applied || intent.status === "COMPLETED") {
            return res.json({
                status: "COMPLETED",
                confirmationMethod: intent.confirmationMethod,
                mpesaReceiptNumber: intent.mpesaReceiptNumber || null,
            });
        }

        if (!intent.checkoutRequestId) {
            return res.status(400).json({ message: "No STK request to query" });
        }

        // ⚠️ ONE explicit query (user clicked button)
        const q = await stkQuery({
            shortCode: intent.paybillShortCode,
            passkey: process.env.MPESA_PASSKEY,
            checkoutRequestId: intent.checkoutRequestId,
        });

        // ❌ Not paid
        if (String(q.ResultCode) !== "0") {
            return res.json({
                status: "PENDING",
                message: "Payment not confirmed yet",
            });
        }

        // ✅ PAID → APPLY SAFELY
        intent.status = "COMPLETED";
        intent.applied = true;
        intent.resultCode = 0;
        intent.resultDesc = "Confirmed via manual check";
        intent.confirmationMethod = "MANUAL_CHECK";

        // ❗ STK Query may not return receipt
        intent.mpesaReceiptNumber ||= null;

        const pod = await SavingsPod.findById(intent.podId);
        if (pod) {
            pod.addContribution(intent.userId, intent.amount, "mpesa");
            const last = pod.contributions[pod.contributions.length - 1];
            if (last) last.transactionId = intent.checkoutRequestId;
            await pod.save();
        }

        await intent.save();

        return res.json({
            status: "COMPLETED",
            confirmationMethod: "MANUAL_CHECK",
        });

    } catch (err) {
        const e = err?.response?.data || err.message;

        if (String(e).includes("Spike arrest")) {
            return res.status(429).json({
                status: "PENDING",
                message: "Too many checks. Please wait a moment and try again.",
            });
        }

        return res.status(500).json({
            message: "Failed to check payment status",
            error: e,
        });
    }
});

/* =====================================================
   M-PESA CALLBACK
===================================================== */
router.post("/mpesa/callback", async (req, res) => {
    console.log("🔥 MPESA CALLBACK RECEIVED");
    console.log("📥 PAYLOAD:", JSON.stringify(req.body, null, 2));

    const cb = req.body?.Body?.stkCallback;
    if (!cb) {
        return res.json({ ResultCode: 0, ResultDesc: "OK" });
    }

    const checkoutRequestId = cb.CheckoutRequestID;

    // 🔍 Find intent using CheckoutRequestID (THIS IS KEY)
    const intent = await PaymentIntent.findOne({ checkoutRequestId });
    if (!intent) {
        console.warn("⚠️ No PaymentIntent for CheckoutRequestID:", checkoutRequestId);
        return res.json({ ResultCode: 0, ResultDesc: "OK" });
    }

    // Always store raw result
    intent.resultCode = cb.ResultCode;
    intent.resultDesc = cb.ResultDesc;

    // ✅ SUCCESS
    if (cb.ResultCode === 0 && !intent.applied) {
        const receipt =
            cb.CallbackMetadata?.Item?.find(i => i.Name === "MpesaReceiptNumber")?.Value;

        intent.status = "COMPLETED";
        intent.mpesaReceiptNumber = receipt;
        intent.confirmationMethod = "CALLBACK";

        // 🔁 Late callback enrichment
        if (intent.applied && intent.confirmationMethod === "FALLBACK") {
            intent.mpesaReceiptNumber = receipt;
            intent.confirmationMethod = "CALLBACK";
            await intent.save();
            return res.json({ ResultCode: 0, ResultDesc: "OK" });
        }
        // 💰 Apply contribution ONCE (idempotent)
        const pod = await SavingsPod.findById(intent.podId);
        if (pod) {
            pod.addContribution(intent.userId, intent.amount, "mpesa");
            const last = pod.contributions[pod.contributions.length - 1];
            if (last) last.transactionId = receipt;
            await pod.save();
        }

        intent.applied = true;
    }

    // ❌ FAILURE / CANCEL
    if (cb.ResultCode !== 0) {
        intent.status = "FAILED";
    }

    await intent.save();

    // 🔑 Safaricom REQUIRES this exact response
    return res.json({ ResultCode: 0, ResultDesc: "OK" });
});


module.exports = router;
