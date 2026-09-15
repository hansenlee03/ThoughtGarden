import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../index.html', import.meta.url);

test('app boot does not depend on a blocking external rendering script', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  assert.match(html, /<script\s+type=["']module["']\s+src=["']\.\/js\/app\.js["']/i);
});
