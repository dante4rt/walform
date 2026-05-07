import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
