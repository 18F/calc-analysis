import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const CACHE_DIR = path.join(__dirname, '.cache');

const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

function keyPath(key: string): string {
    return path.join(CACHE_DIR, key);
}

async function ensureCacheDirExists(): Promise<void> {
    if (!await exists(CACHE_DIR)) {
        await mkdir(CACHE_DIR);
    }
}

export function has(key: string): Promise<boolean> {
    return exists(keyPath(key));
}

export async function get(key: string, getter?: () => Promise<string>): Promise<string> {
    await ensureCacheDirExists();

    if (getter && !await has(key)) {
        await set(key, await getter());
    }

    return readFile(keyPath(key), { encoding: 'utf-8' });
}

export async function getJSON<T>(key: string, getter?: () => Promise<T>): Promise<T> {
    const strGetter = getter ? async () => {
        const obj = await getter();
        return JSON.stringify(obj, null, 2);
    } : undefined;
    const str = await get(key, strGetter);

    return JSON.parse(str) as T;
}

export async function set(key: string, value: string): Promise<void> {
    await ensureCacheDirExists();

    return writeFile(keyPath(key), value, { encoding: 'utf-8' });
}
