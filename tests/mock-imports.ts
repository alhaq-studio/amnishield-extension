const store: Record<string, any> = {};

export const browser = {
  storage: {
    local: {
      async get(key?: string | string[] | Record<string, any>) {
        if (!key) return { ...store };
        if (typeof key === "string") return { [key]: store[key] };
        if (Array.isArray(key)) {
          const res: Record<string, any> = {};
          for (const k of key) res[k] = store[k];
          return res;
        }
        return { ...store };
      },
      async set(obj: Record<string, any>) {
        Object.assign(store, obj);
      },
      async remove(keys: string | string[]) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) delete store[k];
      },
      async clear() {
        for (const k of Object.keys(store)) delete store[k];
      },
    },
    onChanged: {
      addListener() {},
      removeListener() {},
    },
  },
};

export const defineBackground = () => {};
export const defineContentScript = () => {};
