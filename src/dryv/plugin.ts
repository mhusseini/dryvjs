import type {App} from "vue";
import type {DryvOptions} from "@/dryv/typings";
import type {Plugin} from "@vue/runtime-core";
import {reactive} from "vue";
import {defaultProxyOptions} from "@/dryv/defaultProxyOptions";

export const DryvPlugin: Plugin<DryvOptions[]> = {
    install(app: App, ...options: DryvOptions[]) {
        Object.assign(defaultProxyOptions, {
                objectWrapper: o => reactive(o as any)
            },
            ...options);
    }
}