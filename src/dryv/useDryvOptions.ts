import type {DryvProxyOptions} from "@/dryv/typings";
import {defaultProxyOptions} from "@/dryv/defaultProxyOptions";

export function useDryvOptions(options?: DryvProxyOptions): DryvProxyOptions {
    return Object.assign(defaultProxyOptions, options);
}