<script lang="ts">
	import { linkVertical } from 'd3-shape';
	import { fade } from 'svelte/transition';
	import type {
		TreeInteractionEvent,
		DerivedTreeNode,
		InteractionKind,
		TreeInfo,
		OffsetInfo,
		LevelVisual,
		AttributeLabels,
		QcSpec,
		LevelMetrics,
		RootMeta
	} from '$lib/tree-types';
	import { getNodeByPath, getChildName } from '$lib/tree-functions';
	import { getMetricCalcFuction, type MetricCalculator } from '$lib/metric-calculation';
	import { createEventDispatcher } from 'svelte';
	import BrokenFittedText from './BrokenFittedText.svelte';
	import { getColor } from '$lib/style-util';

	export let qcSpec: QcSpec;
	export let attributeLabels: AttributeLabels;
	export let visibleTreeInfo: TreeInfo;
	export let selectedTreeInfo: TreeInfo;
	export let levelVisuals: LevelVisual = [];
	export let levelMetrics: LevelMetrics = [];
	export let rootMeta: RootMeta = {};
	export let pathInCompleteTree: string[] = [];

	//export let treeVizKind: TreeVizKind = 'verticalRectangle';

	export let rootWidth = 30;
	export let treeWidth = 70;
	export let childRate = 0.2;
	export let overHangRate = 0.05;
	export let preStraightRate = 0.05;
	export let treeXOffset = 0;

	export let childrenMargin = 0.2;
	export let minimumChildWidth = childrenMargin * 2 + 1;
	export let linkEdgePadding = minimumChildWidth / 3;
	export let linkBetweenPadRate = 0.2;

	//only internally passed

	export let width = rootWidth;
	export let xOffset = (treeWidth - rootWidth) / 2 + treeXOffset;
	export let levelColorScaleMin = 0;
	export let levelColorScaleMax = 1;

	const dispatch = createEventDispatcher<{ 'tree-interaction': TreeInteractionEvent }>();

	function treeInteract(action: InteractionKind, id: string, metricValue: number | undefined) {
		return () => {
			dispatch('tree-interaction', { path: [...pathInCompleteTree, id], action, metricValue });
		};
	}

	const rectangleLinkPath = linkVertical()
		// @ts-ignore
		.source((d) => d.start)
		// @ts-ignore
		.target((d) => d.end);

	const defO = (n: number | undefined) => (n === undefined ? 0 : n);

	$: onLevel = pathInCompleteTree.length;
	$: visibleNode = getNodeByPath(pathInCompleteTree, visibleTreeInfo.tree);
	$: selectedNode = getNodeByPath(pathInCompleteTree, selectedTreeInfo.tree);

	$: currentLevelViz = levelVisuals[onLevel];

	$: [yOffset, childSize, topExtend, overHangSize] = [
		currentLevelViz?.topOffset,
		...[childRate, preStraightRate, overHangRate].map((x) => currentLevelViz?.totalSize * x)
	].map(defO);
	$: branchYEnd = yOffset + defO(currentLevelViz?.totalSize * (1 - childRate - preStraightRate));
	$: childrenYOffset = branchYEnd + childSize;
	$: pYStart = yOffset + topExtend;

	$: levelMetricFunction = getMetricCalcFuction(
		levelMetrics[onLevel]?.selectedMetric,
		qcSpec,
		onLevel,
		visibleNode,
		rootMeta
	);

	$: nChildren = Object.keys(visibleNode?.children || {}).length;
	$: colorStep = (levelColorScaleMax - levelColorScaleMin) / (nChildren || 1);

	$: parentLinkSurface =
		(width - 2 * linkEdgePadding) * (nChildren > 1 ? 1 - linkBetweenPadRate : 1);
	$: minimumLinkSurface =
		((width - 2 * linkEdgePadding) * linkBetweenPadRate) / (nChildren > 1 ? nChildren - 1 : 1);

	$: childLevel = onLevel + 1;
	$: minimumChildSpaceTaken = minimumChildWidth + 2 * childrenMargin;
	$: divisibleSpace =
		treeWidth - minimumChildSpaceTaken * visibleTreeInfo.meta[childLevel]?.totalNodes;
	$: totalChildLevelWeight = visibleTreeInfo.meta[childLevel]?.totalWeight;
	$: totalChildrenWeight = visibleNode?.childrenSumWeight || 1;

	function parseChild(childId: string, childNode: DerivedTreeNode) {
		const childPath = [...pathInCompleteTree, childId];
		const isSelected = Object.hasOwn(selectedNode?.children || {}, childId);
		const childLevelRate = (childNode?.weight || 0) / totalChildLevelWeight;
		const siblingRate = (childNode?.weight || 0) / totalChildrenWeight;

		const childXOffset =
			getOffset(
				childNode?.totalOffsetOnLevel,
				minimumChildSpaceTaken,
				divisibleSpace,
				totalChildLevelWeight,
				childrenMargin
			) + treeXOffset;

		const childWidth = minimumChildWidth + divisibleSpace * childLevelRate;

		const lSize = {
			parent: parentLinkSurface * siblingRate,
			child: childWidth - 2 * linkEdgePadding
		};

		const p1 = {
			start: [
				xOffset +
					linkEdgePadding +
					getOffset(
						childNode?.totalOffsetAmongSiblings,
						minimumLinkSurface,
						parentLinkSurface,
						totalChildrenWeight,
						0
					),
				pYStart
			],
			end: [childXOffset + linkEdgePadding, branchYEnd]
		};
		const p2 = {
			start: [p1.end[0] + lSize.child, branchYEnd],
			end: [p1.start[0] + lSize.parent, pYStart]
		};

		const ySize = childSize + (isSelected ? overHangSize : 0);
		// @ts-ignore
		const downWardP = `${rectangleLinkPath(p1)} v ${ySize} h ${lSize.child}`;
		// @ts-ignore
		const upWardP = `v ${-ySize} ${rectangleLinkPath(p2)} v ${-topExtend} h ${-lSize.parent}`;
		const linkPath = downWardP + upWardP + ` v ${topExtend}`;
		const childScaleMin =
			levelColorScaleMin + (childNode?.totalOffsetAmongSiblings.rank || 0) * colorStep;
		const childScaleMax = childScaleMin + colorStep;
		const colorRate = (childScaleMax + childScaleMin) / 2;

		const specMetric = levelMetricFunction(childNode?.weight, childId);

		return {
			cachedProps: {
				width: childWidth,
				xOffset: childXOffset,
				pathInCompleteTree: childPath,
				levelColorScaleMax: childScaleMax,
				levelColorScaleMin: childScaleMin
			},
			linkPath,
			isSelected,
			colorRate,
			specMetric,
			name: getChildName(childId, attributeLabels, qcSpec, onLevel) || '',
			width: lSize.child,
			colorStr: getColor(colorRate),
			strId: childPath.join('-')
		};
	}

	function getOffset(
		totalOffset: OffsetInfo | undefined,
		minimumSpace: number,
		divisibleSpace: number,
		totalWeight: number,
		margin: number
	) {
		return (
			(totalOffset?.rank || 0) * minimumSpace +
			(divisibleSpace * (totalOffset?.weight || 0)) / totalWeight +
			margin
		);
	}

	function getParsedChildren(
		visibleNode: DerivedTreeNode | undefined,
		_: object,
		__: MetricCalculator
	) {
		return Object.entries(visibleNode?.children || {}).map(([id, child]) => ({
			id,
			parsedChild: parseChild(id, child)
		}));
	}

	$: parsedChildren = getParsedChildren(visibleNode, currentLevelViz, levelMetricFunction);
</script>

{#each parsedChildren as { id, parsedChild }}
	<defs>
		<linearGradient id="path-grad-{parsedChild.strId}" gradientTransform="rotate(90)">
			<stop
				offset="0%"
				stop-opacity={parsedChild.isSelected ? '80%' : '0%'}
				stop-color={parsedChild.colorStr}
			/>
			<stop
				offset="20%"
				stop-opacity={parsedChild.isSelected ? '80%' : '5%'}
				stop-color={parsedChild.colorStr}
			/>
			<stop
				offset="50%"
				stop-opacity={parsedChild.isSelected ? '80%' : '25%'}
				stop-color={parsedChild.colorStr}
			/>
		</linearGradient>
	</defs>
	<!-- <g transition:fade={{ duration: 200 }}> -->
	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<path
		transition:fade={{ duration: 300 }}
		d={parsedChild.linkPath}
		fill="url('#path-grad-{parsedChild.strId}')"
		on:mouseover={treeInteract('highlight', id, parsedChild.specMetric.rawMetric)}
		on:mouseleave={treeInteract('de-highlight', id, 0)}
		on:click={treeInteract('toggle-select', id, 0)}
	/>
	<rect
		fill-opacity={0.25 + Math.abs(parsedChild.specMetric.normalizedMetric) / 1.5}
		x={parsedChild.cachedProps.xOffset + linkEdgePadding / 4}
		y={branchYEnd +
			childSize / 2 -
			(parsedChild.specMetric.normalizedMetric < 0
				? 0
				: (parsedChild.specMetric.normalizedMetric * childSize) / 2)}
		height={(Math.abs(parsedChild.specMetric.normalizedMetric) * childSize) / 2}
		width={treeWidth / 200}
	/>
	<g style="--y-off: {childrenYOffset}px; --x-off: {parsedChild.cachedProps.xOffset + 0.5}px">
		<BrokenFittedText text={parsedChild.name} width={parsedChild.width} height={childSize} />
	</g>

	{#if parsedChild.isSelected}
		<svelte:self
			{...parsedChild.cachedProps}
			{qcSpec}
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
			{preStraightRate}
			on:tree-interaction
		/>
	{/if}
{/each}

<style>
	path,
	rect,
	stop {
		transition: 0.8s;
	}

	g {
		transition: transform 0.8s;
		transform: translate(var(--x-off), var(--y-off));
	}

	rect {
		fill: var(--color-metric-base);
	}
</style>
