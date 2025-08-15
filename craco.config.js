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
      // 트리 셰이킹 최적화 옵션 명시
      if (!webpackConfig.optimization) {
        webpackConfig.optimization = {};
      }
      webpackConfig.optimization.usedExports = true;
      webpackConfig.optimization.sideEffects = true;
      webpackConfig.optimization.concatenateModules = true;
      // 개발 소스맵 비활성화(경고 최소화 필요 시)
      webpackConfig.devtool = false;
      // 소스맵 관련 경고 무시
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
      ];
      return webpackConfig;
    },
  },
};


