export type OMap<T> = { [index: string]: T };

export type SelectionOption = {
    name: string;
    id: string;
};

export type QcSpec = {
    title: string;
    description: string;
    root_entity_type: string;
    bifurcations: Bifurcation[];
};

export type Bifurcation = {
    resolver_id: string;
    attribute_kind: string;
    filter_format_str: string;
    available_metrics?: string[];
    description: string;
};


export type QcSpecMap = OMap<QcSpec>;
export type AttributeLabels = OMap<OMap<{ name: string; meta: string }>>;


export type BareNode = { children: OMap<BareNode> };

export type TreeNode = {
    name: string;
    weight: number;
    children?: ChildrenMap
};

export type DerivedTreeNode = TreeNode & {
    childrenSumWeight: number;
    totalOffsetOnLevel: OffsetInfo
    totalOffsetAmongSiblings: OffsetInfo;
    children: OMap<DerivedTreeNode>
}

export type ChildrenMap = OMap<TreeNode>;

export type OffsetInfo = { rank: number; weight: number }

export type HoveredInfo = {
    name: string;
    weight?: number;
    path?: string[];
    metricName?: string,
    metricValue?: number,
    weightOnDisplay?: number;
    weightTotal?: number;
};

export type InteractionKind = 'toggle-select' | 'highlight' | 'de-highlight';

export type TreeInteractionEvent = {
    path: string[]; action: InteractionKind; metricValue?: number
}

export type DerivedLevelInfo = { totalWeight: number; totalNodes: number }

export type TreeInfo = { tree: DerivedTreeNode; meta: DerivedLevelInfo[] }
export type FilterFunction = (children: ChildrenMap, path: string[], levelInfos: DerivedLevelInfo[]) => ChildrenMap
export type FilterSpec = { exclude: string[], include: string[], top_n: number }

export type LevelVisElem = { totalSize: number, topOffset: number }
export type LevelVisual = LevelVisElem[]

export type LevelMetrics = { possibleMetrics: string[]; selectedMetric: string }[];

export type RootMeta = OMap<string | number>;