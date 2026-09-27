import { computed, getCurrentScope, onScopeDispose, ref, unref, watch } from 'vue';

/**
 * Cache hasil query sederhana: Map<string, { key: unknown[], data: unknown }>.
 * Dipakai agar perpindahan halaman tidak selalu memicu layar kosong.
 */
const cache = new Map();

/** Daftar query aktif agar `invalidateQueries` bisa memicu refetch. */
const registry = new Set();

function normalizeKey(queryKey) {
    const raw = typeof queryKey === 'function' ? queryKey() : unref(queryKey);
    const parts = Array.isArray(raw) ? raw : [raw];

    return parts.map((part) => unref(part));
}

function serialize(value) {
    return JSON.stringify(value) ?? 'undefined';
}

function matchesPrefix(key, prefix) {
    return prefix.every((part, index) => serialize(key[index]) === serialize(part));
}

/**
 * Query data reaktif dengan cache, dukungan key dinamis, dan `enabled`.
 *
 * @param {{ queryKey: unknown, queryFn: () => Promise<unknown>, enabled?: unknown }} options
 */
export function useQuery(options) {
    const enabled = computed(() => {
        const value = typeof options.enabled === 'function' ? options.enabled() : unref(options.enabled);

        return value === undefined ? true : Boolean(value);
    });

    const key = computed(() => normalizeKey(options.queryKey));
    const serializedKey = computed(() => serialize(key.value));

    const data = ref(cache.get(serializedKey.value)?.data);
    const error = ref(null);
    const isFetching = ref(false);

    let ticket = 0;

    async function fetchNow() {
        const current = ++ticket;
        const activeKey = serializedKey.value;

        isFetching.value = true;

        try {
            const result = await options.queryFn();

            if (current === ticket) {
                cache.set(activeKey, { key: key.value, data: result });
                data.value = result;
                error.value = null;
            }

            return result;
        } catch (e) {
            if (current === ticket) {
                error.value = e;
            }

            return undefined;
        } finally {
            if (current === ticket) {
                isFetching.value = false;
            }
        }
    }

    watch(
        [serializedKey, enabled],
        (next, previous) => {
            const previousKey = previous?.[0];

            if (previousKey !== undefined && next[0] !== previousKey) {
                data.value = cache.get(next[0])?.data;
                error.value = null;
            }

            if (enabled.value) {
                fetchNow();
            }
        },
        { immediate: true },
    );

    const entry = { key, enabled, refetch: fetchNow };
    registry.add(entry);

    if (getCurrentScope()) {
        onScopeDispose(() => registry.delete(entry));
    }

    return {
        data,
        error,
        isFetching,
        isLoading: computed(() => isFetching.value && data.value === undefined),
        refetch: fetchNow,
    };
}

/**
 * Hapus cache dan refetch seluruh query aktif yang cocok dengan awalan key.
 *
 * @param {{ queryKey?: unknown }} options
 */
export function invalidateQueries({ queryKey } = {}) {
    const prefix = queryKey === undefined ? [] : normalizeKey(queryKey);

    for (const [serialized, entry] of cache) {
        if (matchesPrefix(entry.key, prefix)) {
            cache.delete(serialized);
        }
    }

    registry.forEach((entry) => {
        if (entry.enabled.value && matchesPrefix(entry.key.value, prefix)) {
            entry.refetch();
        }
    });
}

/**
 * Mutasi dengan status loading/error. `mutate` menelan error (tersimpan di `error`),
 * sedangkan `mutateAsync` melempar ulang agar bisa ditangani pemanggil.
 *
 * @param {{ mutationFn: (variables?: unknown) => Promise<unknown>, onSuccess?: Function, onError?: Function }} options
 */
export function useMutation(options) {
    const isLoading = ref(false);
    const error = ref(null);

    async function mutateAsync(variables) {
        isLoading.value = true;
        error.value = null;

        try {
            const result = await options.mutationFn(variables);
            await options.onSuccess?.(result, variables);

            return result;
        } catch (e) {
            error.value = e;
            options.onError?.(e, variables);

            throw e;
        } finally {
            isLoading.value = false;
        }
    }

    async function mutate(variables) {
        try {
            return await mutateAsync(variables);
        } catch {
            return undefined;
        }
    }

    return { mutate, mutateAsync, isLoading, error };
}
