import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  /** Neue Regeln zuerst: Dashboard-Navigation & API ohne GET nicht über „pages“-Cache fahren. */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, request, sameOrigin }) =>
          !!sameOrigin &&
          url.pathname.startsWith("/api/") &&
          request.method !== "GET" &&
          request.method !== "HEAD",
        handler: "NetworkOnly",
        options: {
          cacheName: "api-mutations",
        },
      },
      {
        urlPattern: ({ url, request, sameOrigin }) =>
          !!sameOrigin &&
          url.pathname.startsWith("/dashboard") &&
          request.mode === "navigate",
        handler: "NetworkOnly",
        options: {
          cacheName: "dashboard-nav-bypass-sw-cache",
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
