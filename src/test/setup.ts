import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: function (key: string) {
        return this.store[key] || null;
    },
    setItem: function (key: string, value: string) {
        this.store[key] = value.toString();
    },
    removeItem: function (key: string) {
        delete this.store[key];
    },
    clear: function () {
        this.store = {};
    },
    get length() {
        return Object.keys(this.store).length;
    },
    key: function (i: number) {
        const keys = Object.keys(this.store);
        return keys[i] || null;
    },
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
