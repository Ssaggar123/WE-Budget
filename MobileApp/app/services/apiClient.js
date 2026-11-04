
// apiClient.js

const BASE_URL = "http://192.168.1.100:3000/api";

// Generic fetch wrapper
async function apiFetch(url, options = {}) {

    let response = await fetch(BASE_URL + url, {
        ...options,
        credentials: "include" // IMPORTANT for cookies
    });

    // If access token expired
    if (response.status === 401) {

        const refreshed = await refreshToken();

        if (refreshed) {
            // Retry original request
            response = await fetch(BASE_URL + url, {
                ...options,
                credentials: "include"
            });
        } else {
            redirectToLogin();
            return;
        }
    }

    return response;
}
async function refreshToken() {
    try {

        const res = await fetch(BASE_URL + "/auth/refresh", {
            method: "POST",
            credentials: "include"
        });

        if (res.ok) return true;

        return false;

    } catch {
        return false;
    }
}
function redirectToLogin() {
    alert("Session expired. Login again.");
    window.location.href = "login.html";
}
