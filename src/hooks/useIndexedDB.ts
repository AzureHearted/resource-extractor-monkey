import localforage from "localforage";

type Options = Omit<LocalForageOptions, "storeName" | "version">;

/** list 模式：同构存储 */
interface ListStore<T> {
	/** 读取 */
	get(key: string): Promise<T | null>;
	get(key: string, defaultValue: T): Promise<T>;
	/** 写入 */
	set(key: string, value: T): Promise<T>;
	/** 删除单项 */
	remove(key: string): Promise<void>;
	/** 清空当前 store */
	clear(): Promise<void>;
	/** 获取所有 key */
	keys(): Promise<string[]>;
	/** 是否存在 */
	has(key: string): Promise<boolean>;
	/** 获取所有值 */
	getAll(options?: {
		/** 排序函数 */
		sort?: (a: T, b: T) => number;
	}): Promise<T[]>;
	/** 迭代所有 key-value */
	iterate(
		callback: (value: T, key: string, iterationNumber: number) => void,
	): Promise<void>;
}

/**
 * 创建一个通用的 IndexedDB 列表 Store
 * @param storeName 业务模块名（如 config / cards / cache）
 */
export function useListIndexedDB<T = unknown>(
	storeName: string,
	options: Options = {
		name: "extension_db",
		driver: localforage.INDEXEDDB,
	},
): ListStore<T> {
	const store = localforage.createInstance({
		...options,
		storeName, // 每个模块一个 store
	});

	return {
		/** 读取 */
		async get(key: string, defaultValue?: any) {
			return (await store.getItem(key)) ?? defaultValue ?? null;
		},

		/** 写入 */
		async set(key: string, value: any) {
			return await store.setItem(key, value);
		},

		/** 删除单项 */
		async remove(key: string) {
			await store.removeItem(key);
		},

		/** 清空当前 store */
		async clear() {
			await store.clear();
		},

		/** 获取所有 key */
		async keys() {
			return await store.keys();
		},

		/** 是否存在 */
		async has(key: string) {
			const v = await store.getItem<T>(key);
			return v !== null;
		},

		/**
		 * 获取所有值 (支持排序)
		 * @param sortCompareFn 排序函数
		 * @returns 所有值
		 */
		async getAll(options = {}) {
			const { sort } = options;
			const items: T[] = [];
			await store.iterate<T, void>((value, _key) => {
				if (value !== null) items.push(value);
			});

			if (sort) {
				items.sort(sort);
			}

			return items;
		},
		/** 迭代所有 key-value */
		async iterate(callback) {
			await store.iterate(callback);
		},
	};
}

/** dict 模式：异构键值对 */
interface DictStore<Schema extends Record<string, any>> {
	/** 读取 */
	get<K extends keyof Schema>(key: K): Promise<Schema[K] | null>;
	get<K extends keyof Schema>(
		key: K,
		defaultValue: Schema[K],
	): Promise<Schema[K]>;
	/** 写入 */
	set<K extends keyof Schema>(key: K, value: Schema[K]): Promise<Schema[K]>;
	/** 删除单项 */
	remove(key: keyof Schema): Promise<void>;
	/** 清空当前 store */
	clear(): Promise<void>;
	/** 获取所有 key */
	keys(): Promise<(keyof Schema)[]>;
	/** 是否存在 */
	has(key: keyof Schema): Promise<boolean>;
}

/**
 * 创建一个通用的 IndexedDB 键值对 Store
 * @param storeName 业务模块名（如 config）
 */

export function useDictIndexedDB<Schema extends Record<string, any>>(
	storeName: string,
	options: Options = {
		name: "extension_db",
		driver: localforage.INDEXEDDB,
	},
): DictStore<Schema> {
	const store = localforage.createInstance({
		...options,
		storeName, // 每个模块一个 store
	});

	return {
		/** 读取 */
		async get<K extends keyof Schema>(key: K, defaultValue?: any) {
			return (await store.getItem(key as string)) ?? defaultValue ?? null;
		},

		/** 写入 */
		async set<K extends keyof Schema>(key: K, value: Schema[K]) {
			return await store.setItem(key as string, value);
		},

		/** 删除单项 */
		async remove(key: keyof Schema) {
			await store.removeItem(key as string);
		},

		/** 清空当前 store */
		async clear() {
			await store.clear();
		},

		/** 获取所有 key */
		async keys() {
			return await store.keys();
		},

		/** 是否存在 */
		async has(key: string) {
			const v = await store.getItem<Schema[keyof Schema]>(key);
			return v !== null;
		},
	};
}
