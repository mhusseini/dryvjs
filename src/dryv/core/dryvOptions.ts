import type {DryvOptions} from "./typings";
import {defaultDryvOptions} from "./defaultDryvOptions";

export function dryvOptions(...options: (DryvOptions | undefined)[]): DryvOptions {
    return Object.assign({}, defaultDryvOptions, ...options);
}