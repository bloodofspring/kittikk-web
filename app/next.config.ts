import withBundleAnalyzer from '@next/bundle-analyzer'
import StatoscopeWebpackPlugin from '@statoscope/webpack-plugin'
import type { NextConfig } from 'next'
import { patchWebpackConfig } from 'next-global-css'
import withLinaria from 'next-with-linaria'

const isAnalyzeEnabled = process.env.IS_ANALYZE_MODE_ON === '1'
const isReactStrictModeOn = process.env.IS_REACT_STRICT_MODE_ON === '1'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: isReactStrictModeOn,
  images: {
    unoptimized: true,
  },
  compiler: {
    removeConsole: true,
  },
  experimental: {
    scrollRestoration: true,
  },
  webpack: (config, { isServer }) => {
    const plugins: Array<(config: NextConfig) => NextConfig> = []

    if (isAnalyzeEnabled) {
      config.plugins.push(
        // @ts-ignore
        new StatoscopeWebpackPlugin.default({
          saveReportTo: './.next/report-[name]-[hash].html',
          saveStatsTo: './.next/stats-[name]-[hash].json',
        }),
      )
    }

    const newConfig = {
      ...config,
      plugins: [...config.plugins, ...plugins],
      experiments: { ...config.experiments, topLevelAwait: true },
    }

    return patchWebpackConfig(newConfig, { isServer })
  },
}

const config = () => {
  const finalConfig: NextConfig =
    process.env.NEXT_PUBLIC_APP_ENV === 'dev'
      ? {
          ...nextConfig,
          headers: async () => [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'Service-Worker-Allowed',
                  value: '/',
                },
              ],
            },
          ],
        }
      : {
          ...nextConfig,
        }

  const configWithLinaria = withLinaria({ ...finalConfig, linaria: { fastCheck: false } })
  const plugins = [withBundleAnalyzer({ enabled: isAnalyzeEnabled })]

  return plugins.reduce((acc, plugin) => plugin(acc), configWithLinaria)
}

export default config
