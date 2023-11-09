import type { EntityType } from './constants';
import { getEntityKind, getNodeByPath } from './tree-functions';

import type { QcSpec, OMap, EmbeddedNode, SpecializationBasis, PathInTree, AttributeLabels, WeightedNode, SpecBaseOptions } from './tree-types'

export const IGNORED_BASES = [ // too large files...
    'Institution-Country-Global',
    'Concept-Continent-Institution',
    'Institution-Country-Country',
    'Concept-Country-Institution'
]

export const DEFAULT_SPEC_BASES: Record<EntityType, SpecializationBasis> = {
    Institution: { basis: 'Continent', hierarchy: 'Global' },
    Concept: { basis: 'Global', hierarchy: 'Global' },
    Country: { basis: 'Country', hierarchy: 'Global' },
    SubConcept: { basis: 'Global', hierarchy: 'Concept' },
    Continent: { basis: 'Continent', hierarchy: 'Global' }
}

const ID_MAP = {
    Continent: 'continent__id',
    Country: 'country__id'
}

export function getSpecMetricObject(
    weightedRoot: WeightedNode,
    baseKind: SpecializationBasis,
    path: PathInTree,
    rootId: string,
    qcSpec: QcSpec,
    specBaselineOptions: SpecBaseOptions,
    attributeLabels: AttributeLabels
): { nodeDivisor: number, nodeRate: number, baselineRate: number, specMetric: number } {


    const entityKind = getEntityKind(path, qcSpec);
    const node = getNodeByPath(path, weightedRoot);
    const childId = path[path.length - 1]


    let nodeDivisor = weightedRoot.weight;
    let leafD = specBaselineOptions[specBaseKindToStr(entityKind, baseKind.basis, baseKind.hierarchy)];


    if (baseKind.basis != 'Global') {
        leafD = leafD[attributeLabels[qcSpec.root_entity_type][rootId].meta[ID_MAP[baseKind.basis] || baseKind.basis]]
    }
    if (baseKind.hierarchy != 'Global') {
        for (let i = path.length - 2; i >= 0; i--) {
            if (baseKind.hierarchy == qcSpec.bifurcations[i].attribute_kind) {
                const parentId = path[i]
                const relevantParent = getNodeByPath(path.slice(0, i + 1), weightedRoot)
                leafD = leafD[parentId]
                nodeDivisor = relevantParent?.weight;
                break
            }
        }

    } else {
        for (let i = path.length - 2; i > 0; i--) {
            if (qcSpec.root_entity_type == qcSpec.bifurcations[i].attribute_kind) {
                nodeDivisor = getNodeByPath(path.slice(0, i + 1), weightedRoot)?.weight;
                break
            }
        }

    }

    const baselineRate: number = leafD[childId] || 0
    const nodeRate = (node?.weight || 0) / nodeDivisor

    return {
        nodeRate, nodeDivisor, baselineRate, specMetric: nodeRate / baselineRate
    }
}


export function specBaseKindToStr(target: EntityType, basis: string, hierarchy: string) {
    // TODO this knows a naming scheme that it shouldn't
    return `${target}-${basis}-${hierarchy}`
}

export function specBaseStrToKind(specBaseStr: string): { target: EntityType } & SpecializationBasis {
    const [target, basis, hierarchy] = specBaseStr.split('-');
    return { target, basis, hierarchy }
}

// TODO sibling level RCA for some
// TODO normalize metric to show -1 - 1