/*
 * Copyright (C) 2023-2025  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {readFileSync} from 'node:fs';
import {join, dirname as pathDirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {parseJson} from '../dev/json.js';

const dirname = pathDirname(fileURLToPath(import.meta.url));
const rootDir = join(dirname, '..');
/** @type {{scripts: Record<string, string>}} */
const packageJson = parseJson(readFileSync(join(rootDir, 'package.json'), 'utf8'));

describe('build entrypoints', () => {
    test('package scripts use bun for build entrypoints', () => {
        const buildScripts = Object.entries(packageJson.scripts).filter(([name]) => (
            name === 'build' ||
            name === 'build:libs' ||
            name.startsWith('build:serve:')
        ));

        for (const [, command] of buildScripts) {
            expect(command.startsWith('bun ')).toBe(true);
        }
    });

    test('shell wrappers call bun instead of npm', () => {
        expect(readFileSync(join(rootDir, 'build.sh'), 'utf8')).toContain('bun run build -- "$@"');
        expect(readFileSync(join(rootDir, 'build.bat'), 'utf8')).toContain('@bun run build -- %*');
    });
});
