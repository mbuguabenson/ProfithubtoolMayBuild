import Cookies from 'js-cookie';
import { getPropertyValue, isEmptyObject } from '../object/object';
import { deriv_urls } from '../url/constants';

const getObject = function (this: { getItem: (key: string) => string | null }, key: string) {
    return JSON.parse(this.getItem(key) || '{}');
};

const setObject = function (this: { setItem: (key: string, value: string) => void }, key: string, value: unknown) {
    if (value && value instanceof Object) {
        try {
            this.setItem(key, JSON.stringify(value));
        } catch (e) {
            /* do nothing */
        }
    }
};

if (typeof Storage !== 'undefined') {
    Storage.prototype.getObject = getObject;
    Storage.prototype.setObject = setObject;
}

export const isStorageSupported = (storage: Storage) => {
    if (typeof storage === 'undefined') {
        return false;
    }

    const test_key = 'test';
    try {
        storage.setItem(test_key, '1');
        storage.removeItem(test_key);
        return true;
    } catch (e) {
        return false;
    }
};

class Store {
    storage: Storage;

    constructor(storage: Storage) {
        this.storage = storage;
        this.storage.getObject = getObject;
        this.storage.setObject = setObject;
    }

    get(key: string) {
        return this.storage.getItem(key) || undefined;
    }

    set(key: string, value: string) {
        if (typeof value !== 'undefined') {
            this.storage.setItem(key, value);
        }
    }

    getObject(key: string) {
        return typeof this.storage.getObject === 'function' // Prevent runtime error in IE
            ? // @ts-expect-error getObject is not a standard Storage property
              this.storage.getObject(key)
            : JSON.parse(this.storage.getItem(key) || '{}');
    }

    setObject(key: string, value: unknown) {
        if (typeof this.storage.setObject === 'function') {
            // Prevent runtime error in IE
            // @ts-expect-error setObject is not a standard Storage property
            this.storage.setObject(key, value);
        } else {
            this.storage.setItem(key, JSON.stringify(value));
        }
    }

    remove(key: string) {
        this.storage.removeItem(key);
    }

    clear() {
        this.storage.clear();
    }
}

class InScriptStore {
    store: any;

    constructor(object?: any) {
        this.store = typeof object !== 'undefined' ? object : {};
    }

    get(key: string | string[]) {
        return getPropertyValue(this.store, key);
    }

    set(k: string | string[], value: string, obj = this.store) {
        let key = k;
        if (!Array.isArray(key)) key = [key];
        if (key.length > 1) {
            if (!(key[0] in obj) || isEmptyObject(obj[key[0]])) obj[key[0]] = {};
            this.set(key.slice(1), value, obj[key[0]]);
        } else {
            obj[key[0]] = value;
        }
    }

    getObject(key: string) {
        return JSON.parse(this.get(key) || '{}');
    }

    setObject(key: string, value: unknown) {
        this.set(key, JSON.stringify(value));
    }

    remove(...keys: string[]) {
        keys.forEach(key => {
            delete this.store[key];
        });
    }

    clear() {
        this.store = {};
    }

    has(key: string) {
        return this.get(key) !== undefined;
    }

    keys() {
        return Object.keys(this.store);
    }

    call(key: string) {
        if (typeof this.get(key) === 'function') this.get(key)();
    }

    getResponse(pathname: string | string[]) {
        let path = pathname;
        if (typeof path === 'string') {
            const keys = path.split('.');
            path = ['response', keys[0]].concat(keys);
        }
        return this.get(path);
    }
}

export const State = new InScriptStore();
// State.prototype.getByMsgType = State.getResponse;
(State as any).getByMsgType = State.getResponse.bind(State);
State.set('response', '{}');

export class CookieStorage {
    initialized: boolean;
    cookie_name: string;
    domain: string;
    path: string;
    expires: Date;
    value: any;

    constructor(cookie_name: string, cookie_domain?: string) {
        const hostname = window.location.hostname;

        this.initialized = false;
        this.cookie_name = cookie_name;
        this.domain =
            cookie_domain ||
            /* eslint-disable no-nested-ternary */
            (hostname.includes('binary.sx') ? 'binary.sx' : deriv_urls.DERIV_HOST_NAME);
        /* eslint-enable no-nested-ternary */
        this.path = '/';
        this.expires = new Date('Thu, 1 Jan 2037 12:00:00 GMT');
        this.value = {};
    }

    read() {
        const cookie_value = Cookies.get(this.cookie_name);
        try {
            this.value = cookie_value ? JSON.parse(cookie_value) : {};
        } catch (e) {
            this.value = {};
        }
        this.initialized = true;
    }

    write(val: any, expireDate?: Date, isSecure?: boolean) {
        if (!this.initialized) this.read();
        this.value = val;
        if (expireDate) this.expires = expireDate;
        Cookies.set(this.cookie_name, this.value, {
            expires: this.expires,
            path: this.path,
            domain: this.domain,
            secure: !!isSecure,
        });
    }

    get(key: string) {
        if (!this.initialized) this.read();
        return this.value[key];
    }

    set(key: string, val: any) {
        if (!this.initialized) this.read();
        this.value[key] = val;
        Cookies.set(this.cookie_name, this.value, {
            expires: new Date(this.expires),
            path: this.path,
            domain: this.domain,
        });
    }

    remove() {
        Cookies.remove(this.cookie_name, {
            path: this.path,
            domain: this.domain,
        });
    }
}

export const removeCookies = (...cookie_names: string[]) => {
    const domains = [`.${document.domain.split('.').slice(-2).join('.')}`, `.${document.domain}`];

    let parent_path = window.location.pathname.split('/', 2)[1];
    if (parent_path !== '') {
        parent_path = `/${parent_path}`;
    }

    cookie_names.forEach(c => {
        Cookies.remove(c, { path: '/', domain: domains[0] });
        Cookies.remove(c, { path: '/', domain: domains[1] });
        Cookies.remove(c);
        if (new RegExp(c).test(document.cookie) && parent_path) {
            Cookies.remove(c, { path: parent_path, domain: domains[0] });
            Cookies.remove(c, { path: parent_path, domain: domains[1] });
            Cookies.remove(c, { path: parent_path });
        }
    });
};

export const LocalStore = isStorageSupported(window.localStorage)
    ? new Store(window.localStorage)
    : new InScriptStore();
export const SessionStore = isStorageSupported(window.sessionStorage)
    ? new Store(window.sessionStorage)
    : new InScriptStore();
