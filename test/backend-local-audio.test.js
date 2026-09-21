/*
 * Copyright (C) 2026  Yomitan Authors
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

/* eslint-disable no-underscore-dangle -- Test the RPC handler without initializing the browser backend. */

import {afterEach, expect, test, vi} from 'vitest';
import {Backend} from '../ext/js/background/backend.js';
import {log} from '../ext/js/core/log.js';

afterEach(() => vi.restoreAllMocks());

test.each([
    'http://localhost:8080/audio.mp3',
    'https://127.0.0.1/audio.mp3',
    'http://[::1]:8080/audio.mp3',
])('local audio preserves binary data and content type for %s', async (url) => {
    const fetchAudio = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
        new Uint8Array([0, 127, 128, 255]),
        {headers: {'content-type': 'audio/wav'}},
    ));

    await expect(Backend.prototype._onApiFetchLocalAudioData({url}, {})).resolves.toEqual({
        data: 'AH+A/w==',
        contentType: 'audio/wav',
    });
    expect(fetchAudio).toHaveBeenCalledWith(url);
});

test.each([
    'https://example.com/audio.mp3',
    'http://192.168.1.1/audio.mp3',
    'http://localhost.example.com/audio.mp3',
    'http://localhost@example.com/audio.mp3',
    'file:///tmp/audio.mp3',
    'data:audio/mpeg;base64,AA==',
    'not a URL',
])('local audio rejects %s before fetching', async (url) => {
    const fetchAudio = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(log, 'error').mockImplementation(() => {});

    await expect(Backend.prototype._onApiFetchLocalAudioData({url}, {})).resolves.toBeNull();
    expect(fetchAudio).not.toHaveBeenCalled();
});

/* eslint-enable no-underscore-dangle */
