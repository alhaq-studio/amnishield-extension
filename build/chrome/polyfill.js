// Browser API Polyfill for cross-browser compatibility
if (typeof browser === "undefined") {
    var browser = chrome;
}

// For Safari compatibility
if (typeof chrome === "undefined" && typeof safari !== "undefined") {
    var chrome = {
        storage: {
            sync: {
                get: function(keys, callback) {
                    if (typeof keys === 'string') keys = [keys];
                    const result = {};
                    keys.forEach(key => {
                        result[key] = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : undefined;
                    });
                    callback(result);
                },
                set: function(items, callback) {
                    Object.keys(items).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(items[key]));
                    });
                    if (callback) callback();
                },
                onChanged: {
                    addListener: function(callback) {
                        window.addEventListener('storage', callback);
                    }
                }
            }
        },
        runtime: {
            onInstalled: {
                addListener: function(callback) {
                    document.addEventListener('DOMContentLoaded', callback);
                }
            }
        }
    };
    var browser = chrome;
}

// Promise-based wrapper for Chrome APIs
const browserAPI = {
    storage: {
        sync: {
            get: function(keys) {
                return new Promise((resolve) => {
                    browser.storage.sync.get(keys, resolve);
                });
            },
            set: function(items) {
                return new Promise((resolve) => {
                    browser.storage.sync.set(items, resolve);
                });
            }
        }
    },
    runtime: browser.runtime,
    declarativeNetRequest: browser.declarativeNetRequest,
    webRequest: browser.webRequest
};