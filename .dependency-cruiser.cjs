/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration. By default " +
        "this rule does not scrutinize dot-files (e.g. .eslintrc.js), TypeScript declaration " +
        "files (.d.ts), tsconfig.json and some of the babel and webpack configs.",
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$',                  // dot files
          '[.]d[.]ts$',                                                       // TypeScript declaration files
          '(^|/)tsconfig[.]json$',                                            // TypeScript config
          '(^|/)(?:babel|webpack)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$', // other configs
          '(^|/)vitest[.]config[.](?:js|ts|mjs|mts)$'                        // vitest config
        ]
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      comment:
        'A module depends on a node core module that has been deprecated. Find an alternative - these are ' +
        "bound to exist - node doesn't deprecate lightly.",
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: [
          'core'
        ],
        path: [
          '^v8/tools/codemap$',
          '^v8/tools/consarray$',
          '^v8/tools/csvparser$',
          '^v8/tools/logreader$',
          '^v8/tools/profile_view$',
          '^v8/tools/profile$',
          '^v8/tools/SourceMap$',
          '^v8/tools/splaytree$',
          '^v8/tools/tickprocessor-driver$',
          '^v8/tools/tickprocessor$',
          '^node-inspect/lib/_inspect$',
          '^node-inspect/lib/internal/inspect_client$',
          '^node-inspect/lib/internal/inspect_repl$',
          '^async_hooks$',
          '^punycode$',
          '^domain$',
          '^constants$',
          '^sys$',
          '^_linklist$',
          '^_stream_wrap$'
        ],
      }
    },
    {
      name: 'not-to-deprecated',
      comment:
        'This module uses a (version of an) npm module that has been deprecated. Either upgrade to a later ' +
        'version of that module, or find an alternative. Deprecated modules are a security risk.',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: [
          'deprecated'
        ]
      }
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "That's problematic as the package either (1) won't be available on live (2 - worse) will be " +
        "available on live with an non-guaranteed version. Fix it by adding the package to the dependencies " +
        "in your package.json.",
      from: {},
      to: {
        dependencyTypes: [
          'npm-no-pkg',
          'npm-unknown'
        ]
      }
    },
    {
      name: 'package-dependency-only-through-entities',
      severity: 'error',
      comment:
        'Packages should only depend on other packages through the @mmt/entities schemas, not directly on implementations',
      from: {
        path: '^packages/(?!entities)'
      },
      to: {
        path: '^packages/(?!entities)',
        pathNot: [
          // Allow packages to import from their own directory
          '$1'
        ]
      }
    },
    {
      name: 'apps-can-depend-on-packages',
      severity: 'info',
      comment: 'Apps are allowed to depend on packages',
      from: {
        path: '^apps/'
      },
      to: {
        path: '^packages/'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', 'dist', 'build', '.turbo', 'coverage']
    },
    exclude: {
      path: [
        '\\.test\\.[tj]sx?$',   // .test.ts, .test.js, etc.
        '\\.spec\\.[tj]sx?$',   // .spec.ts, .spec.js, etc.
        '\\btest\\b',           // test directories
        '\\btests\\b',          // tests directories
        '\\b__tests__\\b',      // __tests__ directories
        '\\.test\\.d\\.ts$',    // .test.d.ts files
        'test-utils',           // test utility files
        'vitest\\.config'       // vitest config files
      ]
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.mjs', '.cjs']
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: {
            bgcolor: 'transparent',
            splines: 'ortho'
          },
          node: {
            fillcolor: '#e8f4fd',
            color: '#1f77b4',
            fontcolor: '#1f77b4',
            shape: 'box',
            style: 'rounded,filled'
          },
          edge: {
            color: '#757575',
            fontcolor: '#757575',
            arrowhead: 'vee',
            arrowsize: '0.7'
          }
        }
      },
      archi: {
        collapsePattern: '^(packages|apps)/[^/]+',
        theme: {
          graph: {
            bgcolor: 'transparent',
            splines: 'ortho',
            rankdir: 'TB',
            ranksep: '1.5'
          },
          node: {
            fillcolor: '#c6e9ff',
            color: '#0066cc',
            fontcolor: '#0066cc',
            shape: 'box3d',
            style: 'rounded,filled'
          },
          edge: {
            color: '#0066cc',
            fontcolor: '#0066cc',
            penwidth: '2',
            arrowhead: 'vee',
            arrowsize: '1'
          }
        }
      },
      ddot: {
        collapsePattern: '^(packages|apps)/[^/]+',
        theme: {
          graph: {
            bgcolor: 'transparent',
            splines: 'ortho',
            rankdir: 'LR',
            ranksep: '2'
          },
          node: {
            fillcolor: '#ffeaa7',
            color: '#2d3436',
            fontcolor: '#2d3436',
            shape: 'folder',
            style: 'filled'
          },
          edge: {
            color: '#636e72',
            fontcolor: '#636e72',
            penwidth: '1.5',
            arrowhead: 'open',
            arrowsize: '0.9'
          }
        }
      }
    }
  }
};