import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('avatar profile persistence uses the central storage boundary',()=>{
  const avatar=fs.readFileSync('assets/js/avatar-profile.js','utf8');
  const storage=fs.readFileSync('assets/js/storage.js','utf8');

  assert.doesNotMatch(avatar,/\blocalStorage\b/,'avatar-profile.js must not access localStorage directly');
  assert.match(avatar,/from\s+["']\.\/storage\.js\?v=/,'avatar-profile.js must use storage.js');
  assert.match(storage,/avatarProfile:\s*["']digilians\.avatarProfile["']/,'storage.js must own the avatar storage key');
  assert.match(storage,/export function getStoredAvatarProfile\s*\(/);
  assert.match(storage,/export function setStoredAvatarProfile\s*\(/);
  assert.match(storage,/export function clearStoredAvatarProfile\s*\(/);
});
