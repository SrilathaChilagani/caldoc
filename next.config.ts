import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              // core
              "default-src 'self'; " +
              // scripts (Daily + Razorpay + inline for Next)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co https://checkout.razorpay.com https://*.razorpay.com; " +
              // XHR/WebSocket/fetch endpoints
              "connect-src 'self' https://api.daily.co https://*.daily.co https://api.razorpay.com https://*.razorpay.com; " +
              // iframes (Daily meeting + Razorpay checkout)
              "frame-src 'self' https://*.daily.co https://checkout.razorpay.com https://*.razorpay.com; " +
              // images (logos from gateways)
              "img-src 'self' data: https://*.daily.co https://checkout.razorpay.com https://*.razorpay.com; " +
              // styles
              "style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
