import {withSentryConfig} from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.next.json",
  },
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "medplex",

  project: "caldoc",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
