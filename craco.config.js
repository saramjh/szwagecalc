/* CRA webpack 설정 커스터마이즈: 3rd-party 소스맵 경고 억제 */
function visitRules(rules) {
  if (!Array.isArray(rules)) return rules;
  return rules
    .map((rule) => {
      if (!rule) return rule;
      // 하위 oneOf 재귀 처리
      if (Array.isArray(rule.oneOf)) {
        rule.oneOf = visitRules(rule.oneOf);
      }
      // use 배열에서 source-map-loader를 node_modules 제외 처리
      if (rule.use) {
        const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
        const hasSourceMapLoader = uses.some((u) => {
          if (!u) return false;
          const loader = typeof u === 'string' ? u : u.loader;
          return loader && loader.includes('source-map-loader');
        });
        if (hasSourceMapLoader) {
          rule.exclude = /node_modules/;
        }
      }
      return rule;
    })
    .filter(Boolean);
}

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (webpackConfig && webpackConfig.module && Array.isArray(webpackConfig.module.rules)) {
        webpackConfig.module.rules = visitRules(webpackConfig.module.rules);
      }
      
      // 개발 모드에서는 최적화 비활성화
      if (process.env.NODE_ENV === 'development') {
        return webpackConfig;
      }
      
      // 프로덕션에서만 최적화 적용
      if (!webpackConfig.optimization) {
        webpackConfig.optimization = {};
      }
      webpackConfig.optimization.usedExports = true;
      webpackConfig.optimization.sideEffects = false;
      webpackConfig.optimization.concatenateModules = true;
      webpackConfig.optimization.innerGraph = true;
      
      // 🚀 강화된 트리셰이킹 설정
      webpackConfig.optimization.providedExports = true;
      webpackConfig.optimization.mangleExports = 'size';
      
      // 청크 분할 최적화 (프로덕션만)
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          dayjs: {
            test: /[\\/]node_modules[\\/]dayjs[\\/]/,
            name: 'dayjs',
            chunks: 'all',
            priority: 30,
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 30,
          },
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide',
            chunks: 'all',
            priority: 30,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 40,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      };
      
      webpackConfig.devtool = false;
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
      ];
      return webpackConfig;
    },
  },
};


