import type {DryvProxyOptions} from "@/dryv/typings";

class DryvProxyOptionsSingleton {
    public static Instance = {
        objectWrapper: o => o,
        excludedFields: [/^_/, /^$/],
        callServer: async (url: string, method: string, data: any) => {
            if (data && /get/i.test(method)) {
                const query = Object.entries(data)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`, [])
                    .join("&");
                const sep = url.indexOf("?") >= 0 ? "&" : "?";
                url = `${url}${sep}${query}`;
                data = undefined;
            }
            const response = await fetch(url, {method, body: data && JSON.stringify(data)});
            return await response.json();
        },
        valueOfDate: (date: string, locale: string, format: string) => {
            return new Date(date).valueOf();
        }
    };
}

export const defaultProxyOptions: DryvProxyOptions = DryvProxyOptionsSingleton.Instance;