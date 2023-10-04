import countryRcaBase from '$lib/assets/data/rca-bases/cc-cite-qc.json';
import instRcaBase from '$lib/assets/data/rca-bases/init-qc.json';

import type { QcSpec, DerivedTreeNode, RootMeta, OMap } from './tree-types'

export type MetricCalculator = (childWeight: number, childId: string) => { rawMetric: number, normalizedMetric: number };
type MetricCalculatorMeta = (qSpec: QcSpec, onLevel: number, node: DerivedTreeNode | undefined, rootMeta: RootMeta) => MetricCalculator;


const emptyMetricCalc = () => ({ normalizedMetric: 0, rawMetric: 0 });



const METRIC_KINDS: OMap<MetricCalculatorMeta> = {
    //'Sibling level RCA': siblingRCA,
    'Global RCA': getGlobalRCA,
    'Continent level RCA': continentLevelRca,
    //'RCA among institutions of same County': 0
}

export function getMetricCalcFuction(selectedMetric: string, qcSpec: QcSpec, onLevel: number, node: DerivedTreeNode | undefined, rootMeta: RootMeta): MetricCalculator {
    const metaFun = METRIC_KINDS[selectedMetric];
    if (metaFun === undefined) {
        return emptyMetricCalc;
    }
    return metaFun(qcSpec, onLevel, node, rootMeta);
}

function getGlobalRCA(qSpec: QcSpec, onLevel: number, derivedTree: DerivedTreeNode | undefined) {
    const attKind = qSpec.bifurcations[onLevel].attribute_kind
    const globalRcaBase: OMap<number> | undefined = globalRcaBases[attKind];

    return rcaCalcMeta(derivedTree, globalRcaBase)

}

function continentLevelRca(qSpec: QcSpec, onLevel: number, derivedTree: DerivedTreeNode | undefined, rootMeta: RootMeta) {

    const attKind = qSpec.bifurcations[onLevel].attribute_kind;
    const rootContinent = rootMeta.continent;

    const rcaBaseOverall: OMap<OMap<number>> | undefined = continentRcaBases[attKind];

    if (rcaBaseOverall === undefined) {
        return emptyMetricCalc
    }
    const specRcaBase = rcaBaseOverall[rootContinent || ''];

    return rcaCalcMeta(derivedTree, specRcaBase)
}

function rcaCalcMeta(derivedTree: DerivedTreeNode | undefined, rcaBase: OMap<number>) {

    if (rcaBase == undefined) {
        return emptyMetricCalc
    }

    const totalWeightLevel = derivedTree?.weight || 1;
    return (weight: number, childId: string) => {
        const childRate = weight / totalWeightLevel;
        const rca = childRate / rcaBase[childId];
        const normalizedMetric = Math.log2(rca) / 2
        return { rawMetric: rca, normalizedMetric }
    };
}


const conceptGlobalRcaBase = {
    '44783': 0.011,
    '11568': 0.028,
    '18966': 0.027,
    '44048': 0.141,
    '21044': 0.077,
    '64020': 0.042,
    '4578': 0.015,
    '16583': 0.515,
    '10484': 0.05,
    '11797': 0.428,
    '58847': 0.35,
    '32279': 0.074,
    '7501': 0.122,
    '7922': 0.027,
    '25155': 0.136,
    '19974': 0.1,
    '38043': 0.008,
    '48940': 0.032,
    '31340': 0.253
}



const globalRcaBases: OMap<OMap<number>> = {
    Concept: conceptGlobalRcaBase
}

const continentRcaBases: OMap<OMap<OMap<number>>> = {
    Country: countryRcaBase,
    Institution: instRcaBase
}