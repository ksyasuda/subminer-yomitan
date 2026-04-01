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

import {afterAll, expect, test, vi} from 'vitest';
import {DisplayAnki} from '../ext/js/display/display-anki.js';
import {setupDomTest} from './fixtures/dom-test.js';

function createDeferred() {
    /** @type {(value?: unknown) => void} */
    let resolve;
    const promise = new Promise((nextResolve) => {
        resolve = nextResolve;
    });
    return {promise, resolve};
}

const domTestEnv = await setupDomTest();
const {window, teardown} = domTestEnv;
const {document} = window;

afterAll(() => teardown(global));

test('save note starts one background task and ignores repeated clicks while pending', async () => {
    global.chrome = {
        runtime: {
            getURL: (path) => path,
        },
    };
    document.body.innerHTML = `
        <div id="popup-menus"></div>
        <div class="entry">
            <div class="note-actions-container">
                <div data-card-format-index="0">
                    <button
                        class="action-button"
                        data-action="save-note"
                        data-card-format-index="0"
                        title="Add mining note"
                    >
                        <span class="action-icon"></span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const createNoteDeferred = createDeferred();
    const addNoteDeferred = createDeferred();
    const addAnkiNote = vi.fn(() => addNoteDeferred.promise);
    const display = {
        application: {
            api: {
                addAnkiNote,
                suspendAnkiCardsForNote: vi.fn(),
                forceSync: vi.fn(),
            },
        },
        dictionaryEntries: [{}],
        progressIndicatorVisible: {
            setOverride: vi.fn(() => ({})),
            clearOverride: vi.fn(),
        },
    };

    const displayAnki = new DisplayAnki(/** @type {import('../ext/js/display/display.js').Display} */ (display), /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ ({}));
    const entry = /** @type {HTMLElement} */ (document.querySelector('.entry'));
    const button = /** @type {HTMLButtonElement} */ (document.querySelector('[data-action="save-note"]'));
    const initialTitle = button.title;

    displayAnki._dictionaryEntryDetails = [{noteMap: new Map([[0, {requirements: []}]])}];
    displayAnki._cardFormats = [{name: 'Mining', icon: 'circle', fields: {}, type: undefined}];
    displayAnki._getEntry = vi.fn(() => entry);
    displayAnki._hideErrorNotification = vi.fn();
    displayAnki._showErrorNotification = vi.fn();
    displayAnki._updateViewNoteButton = vi.fn();
    displayAnki._createNote = vi.fn(() => createNoteDeferred.promise);

    const firstResult = displayAnki._saveAnkiNote(0, 0);
    displayAnki._saveAnkiNote(0, 0);

    expect(firstResult).toBeUndefined();
    expect(button.disabled).toBe(false);
    expect(button.dataset.pendingSave).toBe('true');
    expect(button.dataset.pendingSaveLabel).toBeUndefined();
    expect(button.title).toBe(initialTitle);
    expect(displayAnki._createNote).toHaveBeenCalledTimes(1);
    expect(addAnkiNote).not.toHaveBeenCalled();
    expect(display.progressIndicatorVisible.setOverride).toHaveBeenCalledTimes(1);
    expect(display.progressIndicatorVisible.setOverride).toHaveBeenCalledWith(true);
    expect(display.progressIndicatorVisible.clearOverride).not.toHaveBeenCalled();

    createNoteDeferred.resolve({
        note: {fields: {Expression: '読む'}},
        errors: [],
        requirements: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(addAnkiNote).toHaveBeenCalledTimes(1);
    addNoteDeferred.resolve(123);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(button.dataset.pendingSave).toBeUndefined();
    expect(button.dataset.pendingSaveLabel).toBeUndefined();
    expect(button.disabled).toBe(false);
    expect(button.title).not.toBe('Adding note in background');
    expect(display.progressIndicatorVisible.clearOverride).toHaveBeenCalledTimes(1);
    delete global.chrome;
});
