/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

/**
 * @returns {{promise: Promise<unknown>, resolve: (value?: unknown) => void}}
 */
function createDeferred() {
    /** @type {(value?: unknown) => void} */
    let resolve = () => {
        throw new Error('Deferred resolved before initialization');
    };
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
    Reflect.set(globalThis, 'chrome', {
        runtime: {
            getURL: (/** @type {string} */ path) => path,
        },
    });
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

    const displayAnki = new DisplayAnki(/** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)), /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ ({}));
    const entry = /** @type {HTMLElement} */ (document.querySelector('.entry'));
    const button = /** @type {HTMLButtonElement} */ (document.querySelector('[data-action="save-note"]'));
    const initialTitle = button.title;

    const createNote = vi.fn(() => createNoteDeferred.promise);
    Reflect.set(displayAnki, '_dictionaryEntryDetails', [{noteMap: new Map([[0, {requirements: []}]])}]);
    Reflect.set(displayAnki, '_cardFormats', [{name: 'Mining', deck: '', model: '', icon: 'circle', fields: {}, type: 'term'}]);
    Reflect.set(displayAnki, '_getEntry', vi.fn(() => entry));
    Reflect.set(displayAnki, '_hideErrorNotification', vi.fn());
    Reflect.set(displayAnki, '_showErrorNotification', vi.fn());
    Reflect.set(displayAnki, '_updateViewNoteButton', vi.fn());
    Reflect.set(displayAnki, '_createNote', createNote);

    const saveAnkiNote = Reflect.get(displayAnki, '_saveAnkiNote');
    const firstResult = Reflect.apply(saveAnkiNote, displayAnki, [0, 0]);
    Reflect.apply(saveAnkiNote, displayAnki, [0, 0]);

    expect(firstResult).toBeUndefined();
    expect(button.disabled).toBe(false);
    expect(button.dataset.pendingSave).toBe('true');
    expect(button.dataset.pendingSaveLabel).toBeUndefined();
    expect(button.title).toBe(initialTitle);
    expect(createNote).toHaveBeenCalledTimes(1);
    expect(addAnkiNote).not.toHaveBeenCalled();
    expect(display.progressIndicatorVisible.setOverride).toHaveBeenCalledTimes(1);
    expect(display.progressIndicatorVisible.setOverride).toHaveBeenCalledWith(true);
    expect(display.progressIndicatorVisible.clearOverride).not.toHaveBeenCalled();

    createNoteDeferred.resolve({
        note: {fields: {Expression: '読む'}},
        errors: [],
        requirements: [],
    });
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

    expect(addAnkiNote).toHaveBeenCalledTimes(1);
    addNoteDeferred.resolve(123);
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

    expect(button.dataset.pendingSave).toBeUndefined();
    expect(button.dataset.pendingSaveLabel).toBeUndefined();
    expect(button.disabled).toBe(false);
    expect(button.title).not.toBe('Adding note in background');
    expect(display.progressIndicatorVisible.clearOverride).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(globalThis, 'chrome');
});

test('stats word mining includes configured Yomitan word audio media options', async () => {
    Reflect.set(globalThis, 'chrome', {
        runtime: {
            getURL: (/** @type {string} */ path) => path,
        },
    });
    document.body.innerHTML = '<div id="popup-menus"></div>';

    const dictionaryEntry = {
        type: 'term',
        headwords: [{term: '猫', reading: 'ねこ'}],
    };
    const createNote = vi.fn(async (/** @type {{requirements?: unknown[]}} */ details) => ({
        note: {fields: {Expression: '猫'}},
        errors: [],
        requirements: Array.isArray(details.requirements) && details.requirements.length > 0 ? [] : [{type: 'audio'}],
    }));
    const addAnkiNote = vi.fn(async () => 555);
    const display = {
        application: {
            api: {
                termsFind: vi.fn(async () => ({
                    dictionaryEntries: [dictionaryEntry],
                })),
                getAnkiNoteInfo: vi.fn(async () => [{noteIds: [321]}]),
                addAnkiNote,
            },
        },
        getOptions: vi.fn(() => ({
            anki: {
                cardFormats: [
                    {
                        name: 'Mining',
                        deck: 'Mining',
                        model: 'JP',
                        icon: 'circle',
                        fields: {},
                        type: 'term',
                    },
                ],
            },
        })),
        updateOptions: vi.fn(),
        getOptionsContext: vi.fn(() => ({depth: 0})),
        getLanguageSummary: vi.fn(() => ({language: 'ja'})),
    };
    const displayAudio = {
        getAnkiNoteMediaAudioDetails: vi.fn(() => ({
            sources: [{type: 'custom-json', url: 'http://localhost/audio?term={term}'}],
            preferredAudioIndex: 0,
            enableDefaultAudioSources: false,
        })),
    };

    const displayAnki = new DisplayAnki(/** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)), /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ (/** @type {unknown} */ (displayAudio)));
    Reflect.set(displayAnki, '_ankiFieldTemplates', '{{audio}}');
    Reflect.set(displayAnki, '_noteTags', ['SubMiner']);
    Reflect.set(displayAnki, '_audioDownloadIdleTimeout', 1234);
    Reflect.set(displayAnki, '_ankiNoteBuilder', {
        getDictionaryStylesMap: vi.fn(() => new Map()),
        getDictionaryEntryDetailsForNote: vi.fn(() => ({
            type: 'term',
            term: '猫',
            reading: 'ねこ',
        })),
        createNote,
    });

    await expect(displayAnki.addNoteFromWord('猫')).resolves.toEqual({
        noteId: 555,
        duplicateNoteIds: [321],
    });

    expect(displayAudio.getAnkiNoteMediaAudioDetails).toHaveBeenCalledWith('猫', 'ねこ');
    expect(createNote).toHaveBeenCalledTimes(2);
    const secondCreateNoteDetails = /** @type {{requirements?: unknown, mediaOptions?: {audio?: unknown}}} */ (createNote.mock.calls[1]?.[0]);
    expect(secondCreateNoteDetails.requirements).toEqual([{type: 'audio'}]);
    expect(secondCreateNoteDetails.mediaOptions?.audio).toEqual({
        sources: [{type: 'custom-json', url: 'http://localhost/audio?term={term}'}],
        preferredAudioIndex: 0,
        idleTimeout: 1234,
        languageSummary: {language: 'ja'},
        enableDefaultAudioSources: false,
    });
    expect(addAnkiNote).toHaveBeenCalledWith({fields: {Expression: '猫'}}, [321]);
    Reflect.deleteProperty(globalThis, 'chrome');
});
