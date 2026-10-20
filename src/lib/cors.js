// The frontend origin must be an exact match (no trailing slash) because
// credentials (cookies) are used. Set FRONTEND_URL in production.
const allowedOrigin =
  process.env.NODE_ENV == "development"
    ? process.env.FRONTEND_URL || "http://localhost:5173"
    : (process.env.FRONTEND_URL || "https://production.app").replace(/\/+$/, "");

let corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export default corsHeaders;
