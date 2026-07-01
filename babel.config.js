const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return values;
      }
      const separator = trimmed.indexOf('=');
      if (separator <= 0) {
        return values;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      values[key] = value;
      return values;
    }, {});
}

const env = loadEnv();

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    function inlineShagoFinoteEnv({types: t}) {
      return {
        visitor: {
          MemberExpression(memberPath) {
            const node = memberPath.node;
            if (
              node.object?.type === 'MemberExpression' &&
              node.object.object?.type === 'Identifier' &&
              node.object.object.name === 'process' &&
              node.object.property?.type === 'Identifier' &&
              node.object.property.name === 'env' &&
              node.property?.type === 'Identifier' &&
              node.property.name.startsWith('SHAGO_FINOTE_')
            ) {
              memberPath.replaceWith(t.valueToNode(env[node.property.name]));
            }
          },
        },
      };
    },
  ],
};
