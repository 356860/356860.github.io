(function (global) {
    class IndexedStateStore {
        constructor({ dbName = 'jump-training-db', storeName = 'state' } = {}) {
            this.dbName = dbName;
            this.storeName = storeName;
            this.dbPromise = null;
            this.available = typeof indexedDB !== 'undefined';
        }

        open() {
            if (!this.available) return Promise.resolve(null);
            if (this.dbPromise) return this.dbPromise;
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'key' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }).catch(error => {
                console.warn('IndexedDB unavailable, fallback to localStorage.', error);
                this.available = false;
                return null;
            });
            return this.dbPromise;
        }

        async get(key, fallback) {
            const db = await this.open();
            if (!db) return this.readLocal(key, fallback);
            return new Promise(resolve => {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ? request.result.value : fallback);
                request.onerror = () => resolve(this.readLocal(key, fallback));
            });
        }

        async set(key, value) {
            const db = await this.open();
            if (!db) {
                this.writeLocal(key, value);
                return;
            }
            return new Promise(resolve => {
                const tx = db.transaction(this.storeName, 'readwrite');
                tx.objectStore(this.storeName).put({ key, value });
                tx.oncomplete = () => {
                    this.writeLocal(key, value);
                    resolve();
                };
                tx.onerror = () => {
                    this.writeLocal(key, value);
                    resolve();
                };
            });
        }

        async migrateFromLocalStorage(keysWithDefaults) {
            const db = await this.open();
            if (!db) return;
            for (const [key, fallback] of Object.entries(keysWithDefaults)) {
                const existing = await this.get(key, undefined);
                if (typeof existing !== 'undefined') continue;
                const migrated = this.readLocal(key, fallback);
                await this.set(key, migrated);
            }
        }

        async loadSnapshot(keysWithDefaults) {
            const snapshot = {};
            for (const [key, fallback] of Object.entries(keysWithDefaults)) {
                snapshot[key] = await this.get(key, fallback);
            }
            return snapshot;
        }

        readLocal(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return fallback;
                return JSON.parse(raw);
            } catch (error) {
                return fallback;
            }
        }

        writeLocal(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn('Failed to persist fallback localStorage state', error);
            }
        }
    }

    global.JumpStorage = {
        createStore(options) {
            return new IndexedStateStore(options);
        }
    };
})(window);
