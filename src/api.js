const BASE_URL = "http://localhost:5000/api";

export async function apiFetch(url, options = {}) {
  const response = await fetch(BASE_URL + url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return null;
  }

  return response;
}