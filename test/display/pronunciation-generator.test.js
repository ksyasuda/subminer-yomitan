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

import {describe, expect} from 'vitest';
import {PronunciationGenerator} from '../../ext/js/display/pronunciation-generator.js';
import {createDomTest} from '../fixtures/dom-test.js';

const test = createDomTest(void 0);

describe('PronunciationGenerator', () => {
    test('createPronunciationGraphJJ clamps explicit pitch patterns to mora plus suffix', ({window}) => {
        const generator = new PronunciationGenerator(window.document);
        const svg = generator.createPronunciationGraphJJ(['う', 'ち', 'こ', 'む'], 'HHHHL');

        expect(svg.getAttribute('viewBox')).toBe('0 0 172 75');
        expect(svg.querySelectorAll('circle')).toHaveLength(5);
    });
});
