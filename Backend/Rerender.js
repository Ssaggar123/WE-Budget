// renderer.js  (Electron renderer process)
// Fixes:
//   - No error handling on the fetch — silent failure if refresh endpoint
//     is down or returns an error
//   - No response status check — a 401/403 was ignored, user stayed on
//     the page with an expired session
//   - Fingerprint only used user-agent + screen dims; added platform for
//     slightly better uniqueness (still not cryptographic — intentional,
//     this is a soft signal for anomaly detection, not auth itself)

const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.platform
].join("|");

fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
        "x-device-fingerprint": fingerprint
    },
    credentials: "include"
})
.then(res => {
    if (res.status === 401) {
        // No refresh cookie present — redirect to login
        window.location.href = "login.html";
    } else if (res.status === 403) {
        // Session compromised — force re-login with warning
        alert("⚠ Your session was flagged as suspicious. Please log in again.");
        window.location.href = "login.html";
    }
    // 200 ok — access token silently refreshed via cookie, continue normally
})
.catch(err => {
    console.error("Token refresh failed:", err);
    // Optionally redirect or show connectivity warning
});