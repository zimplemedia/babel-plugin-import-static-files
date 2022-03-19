import path, { dirname, extname, resolve } from 'path';
import transform from './transform';

export const defaultOptions = {
  baseDir: '/assets',
  publicDir: './public',
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
