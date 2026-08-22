import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is nested under a parent folder; pin the workspace root so
  // Turbopack does not infer it from a stray lockfile higher up the tree.
  turbopack: {
    root: __dirname,
  },
  // The floating dev badge sits on top of the status bar in the bottom-left
  // corner, which is exactly where the DATA INTEGRITY readout lives.
  devIndicators: false,
};

export default nextConfig;
