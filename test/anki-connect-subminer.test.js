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

import {afterEach, expect, test, vi} from 'vitest';
import {parseJson} from '../ext/js/core/json.js';
import {AnkiConnect} from '../ext/js/comm/anki-connect.js';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

test.each([
    ['http://127.0.0.1:8766', 'http://127.0.0.1:8766/', true],
    ['http://127.0.0.1:8765', null, false],
    ['http://127.0.0.1:8765', 'http://127.0.0.1:8766', false],
])('mining sends proxy metadata only to the managed endpoint %s', async (server, managedUrl, usesProxy) => {
    vi.stubGlobal('chrome', {storage: {local: {get: async () => ({subminerAnkiProxyUrl: managedUrl})}}});
    /** @type {string[]} */
    const requests = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        if (typeof init?.body !== 'string') { throw new Error('Expected a JSON request body'); }
        requests.push(init.body);
        return new Response(JSON.stringify(requests.length === 1 ? 6 : 42));
    });
    const client = new AnkiConnect();
    client.enabled = true;
    client.server = server;
    /** @type {import('anki').Note} */
    const note = {
        deckName: 'Test',
        modelName: 'Basic',
        fields: {Front: '猫'},
        tags: ['SubMiner::Stats'],
        options: {
            allowDuplicate: false,
            duplicateScope: 'collection',
            duplicateScopeOptions: {deckName: null, checkChildren: false, checkAllModels: false},
        },
    };

    await expect(client.addNote(note, [17], false)).resolves.toBe(42);

    expect(requests).toHaveLength(2);
    expect(parseJson(requests[1])).toMatchObject({
        action: 'addNote',
        params: usesProxy ?
            {note, subminerDuplicateNoteIds: [17], subminerEnrich: false} :
            {note},
    });
    if (!usesProxy) {
        expect(requests[1]).not.toContain('subminerDuplicateNoteIds');
        expect(requests[1]).not.toContain('subminerEnrich');
    }
});
