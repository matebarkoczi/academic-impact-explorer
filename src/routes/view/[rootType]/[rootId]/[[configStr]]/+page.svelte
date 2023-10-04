<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	import AutoComplete from 'simple-svelte-autocomplete';
	import type {
		TreeInteractionEvent,
		TreeNode,
		HoveredInfo,
		QcSpecMap,
		QcSpec,
		SelectionOption,
		AttributeLabels,
		FilterFunction,
		ChildrenMap,
		BareNode,
		LevelMetrics,
		LevelVisual,
		TreeInfo,
		FilterSpec,
		RootMeta
	} from '$lib/tree-types';
	import {
		getChildName,
		deriveViaFilterSpec,
		deriveTree,
		getNodeByPath,
		handleStore
	} from '$lib/tree-functions';

	import QuercusBranches from '$lib/components/QuercusBranches.svelte';
	import HighlightInfo from '$lib/components/HighlightInfo.svelte';
	import FilterInterface from '$lib/components/FilterInterface.svelte';
	import { APP_NAME } from '$lib/constants';

	let innerHeight: number;
	let innerWidth: number;
	$: svgHeight = ((innerHeight * 0.8) / innerWidth) * 100;
	let svgWidth = 100;
	let sideBarWidth = 17;
	let childRate = 0.3;
	let overHangRate = 0.05;

	let treeWidth = svgWidth - sideBarWidth;
	let treeXOffset = sideBarWidth;

	let fullQcSpecs: QcSpecMap = {};
	let specOptions: SelectionOption[] = [];
	let selectedQcSpecOption: SelectionOption | undefined;
	let highlightedQcSpecOption: SelectionOption;

	let qcRootOptions: SelectionOption[];
	let selectedQcRootOption: SelectionOption;

	let attributeLabels: AttributeLabels = {};

	$: currentQcSpec = fullQcSpecs[selectedQcSpecOption?.id || ''];
	$: loadNewQc(selectedQcSpecOption?.id, selectedQcRootOption?.id);

	const maxOnOneLevel = 15;
	const maxSelectedOnLevel = 3;

	const toSelOpt = (entry: [string, QcSpec]) => ({ id: entry[0], name: entry[1].title });

	// 16444
	onMount(() => {
		handleStore('root-descriptions', (jsv) => {
			// @ts-ignore
			qcRootOptions = jsv[$page.params.rootType];
			selectedQcRootOption = qcRootOptions.filter((x) => x.id == $page.params.rootId)[0];
		});

		handleStore('attribute-statics', (jsv) => {
			// @ts-ignore
			attributeLabels = jsv;
		});

		// @ts-ignore
		handleStore('qc-specs', (qc_specs: QcSpecMap) => {
			fullQcSpecs = Object.fromEntries(
				Object.entries(qc_specs).filter(([k, v]) => v.root_entity_type == $page.params.rootType)
			);
			specOptions = Object.entries(fullQcSpecs).map(toSelOpt);
			selectedQcSpecOption = specOptions[0];
		});
	});

	function loadNewQc(specId: string | undefined, rootId: string | undefined) {
		if ([specId, rootId].includes(undefined)) {
			return;
		}
		goto(`${base}/view/${$page.params.rootType}/${rootId}`);
		handleStore(`qc-builds/${specId}/${rootId}`, (obj) => {
			refillLevelSpecs();
			// @ts-ignore
			[completeTree, filterSpecs, levelMetrics, rootMeta] = [
				{ name: 'Selected!', ...obj },
				filterSpecs,
				levelMetrics,
				getMeta() // TODO: if root type is not an entity type this is a problem
			];
		});
	}

	function getMeta() {
		try {
			return JSON.parse(
				attributeLabels[currentQcSpec.root_entity_type][selectedQcRootOption?.id || ''].meta
			);
		} catch {
			return {};
		}
	}

	function getVisibleFilter(selectionState: BareNode): FilterFunction {
		return (children, path, levelInfos) => {
			if (getNodeByPath(path, selectionState) === undefined) {
				return {};
			} else {
				return children;
			}
		};
	}

	function getLevelVisuals(visInfo: TreeInfo, svgHeight: number): LevelVisual {
		const out = [];
		const levelCount = Math.max(((visInfo?.meta || []).length || 0) - 1, 1);
		let topOffset = 0;
		const stepSize = svgHeight / levelCount;
		for (let i = 0; i < levelCount; i++) {
			out.push({ totalSize: stepSize, topOffset });
			topOffset += stepSize;
		}
		return out;
	}

	function getSelectedFilter(selectionState: BareNode): FilterFunction {
		return (children: ChildrenMap, path, levelInfos) => {
			return Object.fromEntries(
				Object.entries(children).filter(
					([i, child]) => getNodeByPath([...path, i], selectionState) != undefined
				)
			);
		};
	}

	function formatFilter(s: string, pcRootId: any) {
		let regexp = new RegExp('\\{pc_id\\}', 'gi');
		return s.replace(regexp, pcRootId);
	}
	function refillLevelSpecs() {
		const pcRootId = selectedQcRootOption?.id;
		for (let l of [filterSpecs, levelMetrics]) {
			while (l.length > 0) {
				l.pop();
			}
		}

		if (![currentQcSpec, pcRootId].includes(undefined)) {
			for (var bf of currentQcSpec.bifurcations) {
				filterSpecs.push(JSON.parse(formatFilter(bf.filter_format_str, pcRootId)));
				const possibleMetrics = bf.available_metrics || [];
				levelMetrics.push({ possibleMetrics, selectedMetric: possibleMetrics[0] || '' });
			}
		}
	}

	let rootMeta: RootMeta = {};
	let filterSpecs: FilterSpec[] = [{ include: [], exclude: [], top_n: maxOnOneLevel }];
	let levelMetrics: LevelMetrics = [{ possibleMetrics: [''], selectedMetric: '' }];
	let completeTree: TreeNode = { name: 'Root', weight: 10 };
	let selectionState: BareNode = { children: {} };

	$: filteredTreeInfo = deriveViaFilterSpec(completeTree, filterSpecs);
	$: visibleTreeInfo = deriveTree(filteredTreeInfo.tree, getVisibleFilter(selectionState));
	$: selectedTreeInfo = deriveTree(visibleTreeInfo.tree, getSelectedFilter(selectionState));
	$: levelVisuals = getLevelVisuals(visibleTreeInfo, svgHeight);

	let hInfo: HoveredInfo;

	function handleInteraction(event: CustomEvent<TreeInteractionEvent>) {
		const path = event.detail.path;
		const leafId = path[path.length - 1];
		const action = event.detail.action;

		if (action == 'highlight') {
			const leaf = getNodeByPath(path, filteredTreeInfo.tree);
			if (leaf === undefined) {
				return;
			}
			hInfo = {
				name: getChildName(leafId, attributeLabels, currentQcSpec, path.length - 1),
				path,
				weight: leaf.weight,
				metricName: levelMetrics[path.length - 1]?.selectedMetric,
				metricValue: event.detail.metricValue
			};
			return;
		} else if (action == 'de-highlight') {
			return;
		}

		let parentToChange = getNodeByPath(path.slice(0, path.length - 1), selectionState);
		if (parentToChange === undefined) {
			return;
		}
		let isSelected = Object.keys(parentToChange.children).includes(leafId);

		if (isSelected) {
			delete parentToChange.children[leafId];
		} else {
			parentToChange.children[leafId] = {
				children: parentToChange.children[leafId]?.children || {}
			};
		}
		selectionState = selectionState;
	}
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="treefix">
	<div class="treehead">
		<div class="filt-side" style="--sb-size: {(100 * sideBarWidth) / svgWidth}%">
			<span><b style="color: magenta;">TODO: </b></span>
			<span>control-panel here</span>
		</div>
		<div class="main-side" style="--tree-size: {(100 * treeWidth) / svgWidth}%">
			<AutoComplete
				items={qcRootOptions}
				bind:selectedItem={selectedQcRootOption}
				labelFieldName="name"
				valueFieldName="id"
				hideArrow={true}
				className={'inst-search'}
			/>
		</div>
	</div>
	<div class="treecontent">
		<svg viewBox="0 0 {svgWidth} {svgHeight}" xmlns="http://www.w3.org/2000/svg">
			<HighlightInfo {hInfo} {sideBarWidth} />
			{#each levelVisuals || [] as lVis, index}
				<FilterInterface
					{lVis}
					{index}
					{childRate}
					{overHangRate}
					{sideBarWidth}
					{svgWidth}
					{currentQcSpec}
					metricOptions={levelMetrics[index].possibleMetrics}
					bind:filterSpecs
					bind:selectedMetric={levelMetrics[index].selectedMetric}
				/>
			{/each}
			<QuercusBranches
				qcSpec={currentQcSpec}
				{attributeLabels}
				{visibleTreeInfo}
				{selectedTreeInfo}
				{levelVisuals}
				{levelMetrics}
				{rootMeta}
				{treeWidth}
				{treeXOffset}
				{childRate}
				{overHangRate}
				on:tree-interaction={handleInteraction}
			/>
		</svg>
	</div>
	<div class="treefoot">
		<p style="text-align: center;"><b>{APP_NAME}</b></p>
	</div>
</div>

<style>
	svg {
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
	}

	.treefix {
		display: flex;
		flex-flow: column;
		height: 100%;
	}

	.treefix .treehead {
		display: flex;
		flex: 0 1 auto;
	}

	.treefix .treecontent {
		flex: 1 1 auto;
	}

	.treefix .treefoot {
		flex: 0 1 20px;
	}

	.filt-side {
		flex: 0 0 var(--sb-size);
		display: flex;
		flex-wrap: wrap;
	}

	.filt-side > span {
		margin: 20px;
	}

	:global(.inst-search) {
		margin: 15px;
		font-size: x-large;
	}

	.main-side {
		display: flex;
		justify-content: center;
		flex: 0 0 var(--tree-size);
	}
</style>
