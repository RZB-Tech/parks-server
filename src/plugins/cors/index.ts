export const corsConfigs = {
  // Reflect the request origin so credentialed browser requests work.
  // Replace this with an explicit allowlist when the frontend URLs are fixed.
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};
