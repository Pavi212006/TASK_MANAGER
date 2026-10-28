const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCRIPT_PATH = path.resolve(__dirname, '../script.js');
const STORAGE_KEY = 'student-task-manager.tasks';
const ids = ['taskForm', 'taskInput', 'taskList', 'taskFilter', 'taskSummary', 'emptyState', 'formMessage', 'clearCompleted'];

class MockElement {
    constructor(tagName = 'div', id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.value = '';
        this.textContent = '';
        this.children = [];
        this.parentNode = null;
        this.listeners = {};
        this.attributes = {};
        this.classes = new Set();
        this.className = '';
        this.hidden = false;
        this.checked = false;
        this.type = '';
        this.classList = {
            add: (name) => this.classes.add(name),
            remove: (name) => this.classes.delete(name),
            contains: (name) => this.classes.has(name),
            toggle: (name) => {
                if (this.classes.has(name)) { this.classes.delete(name); return false; }
                this.classes.add(name); return true;
            },
        };
    }
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
    dispatch(type, event = {}) {
        for (const callback of this.listeners[type] || []) callback({ preventDefault() {}, ...event });
        if (type === 'click' && typeof this.onclick === 'function') this.onclick();
    }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    append(...children) { children.forEach((child) => this.appendChild(child)); }
    replaceChildren(...children) {
        this.children.forEach((child) => { child.parentNode = null; });
        this.children = [];
        this.append(...children);
    }
    remove() {
        if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
        this.parentNode = null;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() { this.focused = true; }
    reset() { if (globalElements.taskInput) globalElements.taskInput.value = ''; }
}

let globalElements;

function boot(storage = new Map()) {
    const elements = {};
    for (const id of ids) {
        const tag = id === 'taskForm' ? 'form' : id === 'taskInput' ? 'input' : id === 'taskList' ? 'ul' : id === 'taskFilter' ? 'select' : 'div';
        elements[id] = new MockElement(tag, id);
    }
    elements.taskFilter.value = 'all';
    globalElements = elements;

    const localStorage = {
        getItem: (key) => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
    };
    const document = {
        getElementById: (id) => elements[id] || (elements[id] = new MockElement('div', id)),
        createElement: (tag) => new MockElement(tag),
    };
    let nextId = 0;
    const context = {
        document,
        localStorage,
        window: { crypto: { randomUUID: () => 'test-id-' + (++nextId) } },
        console: { error() {} },
        JSON, Math, Date,
    };
    vm.runInNewContext(fs.readFileSync(SCRIPT_PATH, 'utf8'), context, { filename: SCRIPT_PATH });
    return { elements, storage, context };
}

function descendants(node, tagName) {
    let result = [];
    for (const child of node.children) {
        if (child.tagName === tagName.toUpperCase()) result.push(child);
        result = result.concat(descendants(child, tagName));
    }
    return result;
}

function submitTask(app, title) {
    app.elements.taskInput.value = title;
    app.elements.taskForm.dispatch('submit');
}

function rowWithTitle(app, title) {
    return app.elements.taskList.children.find((row) => descendants(row, 'span').some((span) => span.textContent === title));
}

function completeTask(app, title) {
    const row = rowWithTitle(app, title);
    assert.ok(row, 'expected task row: ' + title);
    const checkbox = descendants(row, 'input')[0];
    checkbox.checked = true;
    checkbox.dispatch('change');
}

test('adds a task and saves it to local storage', () => {
    const app = boot();
    submitTask(app, 'Revise SQL');
    const saved = JSON.parse(app.storage.get(STORAGE_KEY));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].title, 'Revise SQL');
    assert.equal(app.elements.taskList.children.length, 1);
});

test('rejects blank or whitespace-only tasks', () => {
    const app = boot();
    submitTask(app, '   ');
    assert.equal(app.elements.taskList.children.length, 0);
    assert.equal(app.elements.taskInput.focused, true);
});

test('retains completion state after reloading', () => {
    const app = boot();
    submitTask(app, 'Practice joins');
    completeTask(app, 'Practice joins');
    const reloaded = boot(app.storage);
    assert.equal(JSON.parse(reloaded.storage.get(STORAGE_KEY))[0].completed, true);
    assert.equal(descendants(reloaded.elements.taskList, 'input')[0].checked, true);
});

test('deletes only one task when two tasks share the same title', () => {
    const app = boot();
    submitTask(app, 'Duplicate');
    submitTask(app, 'Duplicate');
    descendants(app.elements.taskList, 'button')[0].dispatch('click');
    assert.equal(JSON.parse(app.storage.get(STORAGE_KEY)).length, 1);
});

test('filters active and completed tasks', () => {
    const app = boot();
    submitTask(app, 'Done item');
    submitTask(app, 'Active item');
    completeTask(app, 'Done item');
    app.elements.taskFilter.value = 'active';
    app.elements.taskFilter.dispatch('change');
    assert.equal(descendants(app.elements.taskList, 'span')[0].textContent, 'Active item');
    app.elements.taskFilter.value = 'completed';
    app.elements.taskFilter.dispatch('change');
    assert.equal(descendants(app.elements.taskList, 'span')[0].textContent, 'Done item');
});

test('clears completed tasks without deleting active tasks', () => {
    const app = boot();
    submitTask(app, 'Done item');
    submitTask(app, 'Keep item');
    completeTask(app, 'Done item');
    app.elements.clearCompleted.dispatch('click');
    const saved = JSON.parse(app.storage.get(STORAGE_KEY));
    assert.deepEqual(saved.map((task) => task.title), ['Keep item']);
});

test('migrates legacy string-array storage', () => {
    const oldStorage = new Map([['tasks', JSON.stringify(['Legacy task'])]]);
    const app = boot(oldStorage);
    const saved = JSON.parse(app.storage.get(STORAGE_KEY));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].title, 'Legacy task');
    assert.equal(saved[0].completed, false);
});

test('renders HTML-like task text as text content', () => {
    const app = boot();
    const payload = '<img src=x onerror=alert(1)>';
    submitTask(app, payload);
    const title = descendants(app.elements.taskList, 'span')[0];
    assert.equal(title.textContent, payload);
    assert.equal(title.children.length, 0);
});
