import path, { dirname, extname, resolve } from 'path';
import transform from './transform';

// cdnUri eg. cdn.example.com
// baseUri eg. the domain you serve the web. eg. www.example.com, example.com

export const defaultOptions = {
  baseDir: '/assets',
  publicDir: './public',
  cdnUri: null,
  hash: true,
  enabled: true,
  extensions: ['.gif', '.jpeg', '.jpg', '.png', '.svg'],
};

const applyTransform = (p, t, state, value, calleeName) => {
  const ext = extname(value);
  let options = Object.assign({}, defaultOptions, state.opts);
  var originalAbsPath = value;

  if (options.extensions && options.extensions.indexOf(ext) >= 0) {
    const dir = dirname(resolve(state.file.opts.filename));
    let absPath = resolve(dir, value);

    if (options.baseDir) {
      options.baseDir = options.baseDir.replace(/[/\\]+/g, path.sep);
    }

    const root = state.file.opts.sourceRoot || process.cwd();

    if (options.srcDir && options.outDir) {
      const srcPath = resolve(root, options.srcDir);
      const outPath = resolve(root, options.outDir);
      absPath = absPath.replace(outPath, srcPath);
    }

    absPath = resolve(root, options.publicDir, `.${absPath}`);

    // hack to serve svg sprite from the same domain as the web. because the svg-sprite only work on same domain, not cdn.
    // https://css-tricks.com/svg-sprites-use-better-icon-fonts
    // https://stackoverflow.com/questions/32850536/cross-domain-svg-sprite

    if (absPath.indexOf('.svg') === -1) {
      options.baseUri = options.cdnUri;
    }

    transform(p, t, state, options, absPath, originalAbsPath, calleeName);
  }
};

export function transformImportsInline({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(p, state) {
        applyTransform(p, t, state, p.node.source.value, 'import');
      },
      CallExpression(p, state) {
        const callee = p.get('callee');
        if (!callee.isIdentifier() || !callee.equals('name', 'require')) {
          return;
        }

        const arg = p.get('arguments')[0];
        if (!arg || !arg.isStringLiteral()) {
          return;
        }

        applyTransform(p, t, state, arg.node.value, 'require');
      },
    },
  };
}

export default transformImportsInline;
