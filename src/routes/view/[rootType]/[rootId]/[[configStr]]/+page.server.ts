import { INSTITUTION_TYPE } from "$lib/constants";
import instList from '$lib/assets/data/insts.json';

/** @type {import('./$types').EntryGenerator} */
export function entries() {
    return instList.map((x) => ({ rootType: INSTITUTION_TYPE, rootId: x.toString() }));
}
export const prerender = true;
