/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {removeSerboCroatianAccentMarks} from '../../ext/js/language/sh/serbo-croatian-text-preprocessors.js';

/**
 * @param {string} text
 * @param {boolean} setting
 * @returns {string}
 */
function process(text, setting) {
    return removeSerboCroatianAccentMarks.process(text, setting);
}

describe('removeSerboCroatianAccentMarks', () => {
    test('passes text through when disabled', () => {
        expect(process('čȕvaj', false)).toBe('čȕvaj');
    });

    test('removes acute accents from vowels', () => {
        expect(process('A\u0301 a\u0301', true)).toBe('A a');
    });

    test('preserves non-accented letters and spacing', () => {
        expect(process('čuvaj kuću', true)).toBe('čuvaj kuću'.normalize('NFD'));
    });

    test('strips combining accent marks after Serbo-Croatian vowels only', () => {
        expect(process('go\u0301rjеti', true)).toBe('gorjеti');
    });

    test('operates on NFD text', () => {
        expect(process('čȕvaj'.normalize('NFD'), true)).toBe('čuvaj'.normalize('NFD'));
    });
});
