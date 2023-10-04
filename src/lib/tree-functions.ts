const DEFAULT_TOP_N = 10;

import type { QcSpec, TreeNode, FilterFunction, DerivedLevelInfo, FilterSpec, ChildrenMap, OffsetInfo, DerivedTreeNode, BareNode, AttributeLabels } from './tree-types'
import { STORE_URL } from './constants';

export function deriveTree(source: TreeNode, filterFunction: FilterFunction) {

    const meta: DerivedLevelInfo[] = []
    return { tree: recurseFilter([], source, meta, 0, filterFunction, { rank: 0, weight: 0 }), meta: meta }

}

export function deriveViaFilterSpec(root: TreeNode, filters: FilterSpec[]) {
    const specBasedFF = (children: ChildrenMap, path: string[]) => {
        return specBasedFilter(children, filters[path.length] || { top_n: DEFAULT_TOP_N, exclude: [], include: [] })
    }
    return deriveTree(root, specBasedFF)
}


export function recurseFilter(
    path: string[],
    root: TreeNode,
    levelInfos: DerivedLevelInfo[],
    onLevel: number,
    filterFunction: FilterFunction,
    totalOffsetAmongSiblings: OffsetInfo
): DerivedTreeNode {

    //TODO this should not update if only low level filters are updated 
    let childrenSumWeight = 0
    let childN = 0
    if (levelInfos.length <= onLevel) {
        levelInfos.push({ totalWeight: 0, totalNodes: 0 })
    }
    const totalOffsetOnLevel = { weight: levelInfos[onLevel].totalWeight, rank: levelInfos[onLevel].totalNodes }

    levelInfos[onLevel].totalWeight += root.weight
    levelInfos[onLevel].totalNodes++


    const selectedEntries = Object.entries(filterFunction(root.children || {}, path, levelInfos))
    selectedEntries.sort((l, r) => l[1].weight - r[1].weight);
    const children = Object.fromEntries(selectedEntries.map(([id, child]) => {
        const entries = [id, recurseFilter([...path, id], child, levelInfos, onLevel + 1, filterFunction, { weight: childrenSumWeight, rank: childN })]
        childrenSumWeight += child.weight
        childN++
        return entries
    }))
    return { ...root, children, childrenSumWeight, totalOffsetAmongSiblings, totalOffsetOnLevel }
}

function specBasedFilter(children: ChildrenMap, filterSpec: FilterSpec) {
    const selectedNodes: { [id: string]: TreeNode } = {}
    let maxDisplay = filterSpec?.top_n || DEFAULT_TOP_N

    for (const incId of (filterSpec.include || [])) {
        selectedNodes[incId] = children[incId];
        maxDisplay--;
        if (maxDisplay == 0) {
            return selectedNodes
        }
    }

    const topEntries: [string, TreeNode][] = [];
    Object.entries(children || {}).map(([id, child]) => {
        if ((filterSpec.exclude || []).includes(id)) {
            return
        }
        if (topEntries.length < maxDisplay) {
            insertKeepingOrder([id, child], topEntries);

        } else {
            if (child.weight > topEntries[0][1].weight) {
                topEntries.shift();
                insertKeepingOrder([id, child], topEntries)
            }
        }
    })
    return { ...Object.fromEntries(topEntries), ...selectedNodes }

}

export function insertKeepingOrder(e: [string, TreeNode], l: [string, TreeNode][]) {
    let left = 0;
    let right = l.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (l[mid][1].weight == e[1].weight) {
            return l.splice(mid, 0, e);
        } else if (l[mid][1].weight < e[1].weight) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    l.splice(left, 0, e);
}

export function getNodeByPath<T extends TreeNode | BareNode>(
    path: string[],
    root: T | undefined
): T | undefined {
    let lChild = root;
    for (const cid of path) {
        lChild = (lChild?.children || {})[cid] as T | undefined;
        if (lChild === undefined) {
            return lChild;
        }
    }
    return lChild;
}

export function getChildName(childId: string, attributeLabels: AttributeLabels, qcSpec: QcSpec, onLevel: number) {
    if (attributeLabels === undefined) {
        return 'Loading...';
    }
    const attKind = qcSpec.bifurcations[onLevel].attribute_kind;
    return attributeLabels[attKind][childId]?.name;
}

export function handleStore(endPoint: string, fun: (o: object) => undefined) {
    fetch(`${STORE_URL}/${endPoint}.json.gz`).then((res) => {
        res.json().then((jsv) => {
            fun(jsv);
        });
    });
}
