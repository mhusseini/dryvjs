import type {DryvOptions} from "@/dryv/typings";
import {defaultProxyOptions} from "@/dryv/defaultProxyOptions";

export function useDryvOptions(...options: (DryvOptions | undefined)[]): DryvOptions {
    return Object.assign({}, defaultProxyOptions, ...options);
}