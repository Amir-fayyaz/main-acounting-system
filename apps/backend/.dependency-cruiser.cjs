/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports are forbidden.',
      from: {},
      to: { circular: true },
    },
        {
      name: 'tenant-public-api-only',
      severity: 'error',
      comment:
        'Anything outside the tenant module may import only src/modules/tenant/public-api.ts.',
      from: { pathNot: '^src/modules/tenant/' },
      to: {
        path: '^src/modules/tenant/',
        pathNot: '^src/modules/tenant/public-api\\.ts$',
      },
    },
    {
      name: 'tenant-depends-on-no-module',
      severity: 'error',
      comment: 'Tenant is a leaf module: others depend on it, never the reverse.',
      from: { path: '^src/modules/tenant/' },
      to: { path: '^src/modules/(?!tenant/)' },
    },
  ],
   options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.js'],
    },
  },
};