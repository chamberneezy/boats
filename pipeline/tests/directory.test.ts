// src/data/directory.json (lakes and piers for every platform) must be publishable, and the checks
// that keep it so must actually bite.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DirectoryPackage } from '../../src/timetable/types.ts';
import { readDirectory, validateDirectory } from '../directory.ts';

test('directory.json passes validation', () => {
  assert.deepEqual(validateDirectory(readDirectory()), []);
});

test('validation catches the edits most likely to break a pier list', () => {
  const broken = (edit: (pkg: DirectoryPackage) => void): string[] => {
    const pkg = readDirectory();
    edit(pkg);
    return validateDirectory(pkg);
  };
  assert.ok(broken((d) => d.pierLists['lake-zurich'].push({ id: '8503999', name: 'Bürkliplatz' })).some((p) => p.includes('not unique')));
  assert.ok(broken((d) => (d.lakes[0].popularPiers = ['8500000'])).some((p) => p.includes('not in its list')));
  assert.ok(broken((d) => (d.lakes[0].piers = 'nope')).some((p) => p.includes('unknown pier list')));
  assert.ok(broken((d) => d.lakes.pop()).some((p) => p.includes('missing here')));
  assert.ok(broken((d) => (d.pierLists['lake-zug'][0].id = 'x1')).some((p) => p.includes('7-digit')));
});
