import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

function getHash(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function getFile(state, absPath, opts) {
  const root = state.file.opts.sourceRoot || process.cwd();
  let file;

  if (opts.hash === true) {
    const content = fs.readFileSync(absPath, 'utf8');
    const ext = path.extname(absPath);
    file = path.basename(absPath, ext) + '-' + getHash(content) + ext;
  } else {
    file = path.sep + absPath.substr(root.length).replace(/^[/\\]+/, '');
  }

  if (opts.baseDir) {
    file = path.sep + path.join(opts.baseDir, file).replace(/^[/\\]+/, '');
    fs.copySync(absPath, path.join(root, opts.outDir || '', file));
  }

  return (
    '/' +
    file
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+/g, '')
  );
}

const getVariableName = (p) => {
  if (p.node.specifiers && p.node.specifiers[0] && p.node.specifiers[0].local) {
    return p.node.specifiers[0].local.name;
  }
};

export default (p, t, state, opts, absPath, originalAbsPath, calleeName) => {
  let uri;

  if (opts.enabled) {
    const file = getFile(state, absPath, opts);

    uri = `${opts.baseUri || ''}${file}`;
  } else {
    uri = originalAbsPath;
  }

  // check if the files used by require('/path/to/file') or import file from '/path/to/file'
  if (calleeName === 'require') {
    p.replaceWith(t.StringLiteral(uri));
    return;
  }

  const variableName = getVariableName(p);
  if (variableName) {
    p.replaceWith(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(variableName), t.stringLiteral(uri)),
      ])
    );
  }
};
