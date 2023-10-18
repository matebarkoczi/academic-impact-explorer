<script lang="ts">
	import { linkVertical } from 'd3-shape';
	import { fade } from 'svelte/transition';
	import type {
		TreeInteractionEvent,
		EmbeddedNode,
		InteractionKind,
		TreeInfo,
		OffsetInfo,
		LevelVisual,
		AttributeLabels,
		QcSpec,
		RootMeta,
		BareNode
	} from '$lib/tree-types';
	import { getNodeByPath } from '$lib/tree-functions';
	import { createEventDispatcher } from 'svelte';
	import BrokenFittedText from './BrokenFittedText.svelte';
	import { getColor } from '$lib/style-util';

	export let qcSpec: QcSpec;
	export let attributeLabels: AttributeLabels;
	export let visibleTreeInfo: TreeInfo;
	export let selectionState: BareNode;
	export let levelVisuals: LevelVisual = [];
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

	const dispatch = createEventDispatcher<{ 'tree-interaction': TreeInteractionEvent }>();

	function treeInteract(action: InteractionKind, id: string, x: number, y: number) {
		return () => {
			dispatch('tree-interaction', {
				path: [...pathInCompleteTree, id],
				action,
				topLeftCorner: { x, y }
			});
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

	$: currentLevelViz = levelVisuals[onLevel];

	$: [yOffset, childSize, topExtend, overHangSize] = [
		currentLevelViz?.topOffset,
		...[childRate, preStraightRate, overHangRate].map((x) => currentLevelViz?.totalSize * x)
	].map(defO);
	$: branchYEnd = yOffset + defO(currentLevelViz?.totalSize * (1 - childRate - preStraightRate));
	$: childrenYOffset = branchYEnd + childSize;
	$: pYStart = yOffset + topExtend;

	$: nChildren = Object.keys(visibleNode?.children || {}).length;

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

	function parseChild(childId: string, childNode: EmbeddedNode) {
		const childPath = [...pathInCompleteTree, childId];
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

		const ySize = childSize + (childNode.isSelected ? overHangSize : 0);
		// @ts-ignore
		const downWardP = `${rectangleLinkPath(p1)} v ${ySize} h ${lSize.child}`;
		// @ts-ignore
		const upWardP = `v ${-ySize} ${rectangleLinkPath(p2)} v ${-topExtend} h ${-lSize.parent}`;
		const linkPath = downWardP + upWardP + ` v ${topExtend}`;

		return {
			id: childId,
			cachedProps: {
				width: childWidth,
				xOffset: childXOffset,
				pathInCompleteTree: childPath
			},
			vizInfo: {
				linkPath,
				width: lSize.child,
				colorStr: getColor(childNode.scaleEnds.mid),
				strId: childPath.join('-')
			},
			childNode
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

	function getParsedChildren(visibleNode: EmbeddedNode | undefined, _: object) {
		return Object.entries(visibleNode?.children || {}).map(([id, child]) => parseChild(id, child));
	}

	$: parsedChildren = getParsedChildren(visibleNode, currentLevelViz);
</script>

{#each parsedChildren as { id, cachedProps, vizInfo, childNode } (id)}
	<defs>
		<linearGradient id="path-grad-{vizInfo.strId}" gradientTransform="rotate(90)">
			<stop
				offset="0%"
				stop-opacity={childNode.isSelected ? '80%' : '5%'}
				stop-color={vizInfo.colorStr}
			/>
			<stop
				offset="20%"
				stop-opacity={childNode.isSelected ? '80%' : '15%'}
				stop-color={vizInfo.colorStr}
			/>
			<stop
				offset="50%"
				stop-opacity={childNode.isSelected ? '80%' : '25%'}
				stop-color={vizInfo.colorStr}
			/>
		</linearGradient>
	</defs>

	<path
		transition:fade={{ duration: 300 }}
		d={vizInfo.linkPath}
		fill="url('#path-grad-{vizInfo.strId}')"
	/>
	<rect
		fill-opacity={0.25 + Math.abs(childNode.specMetric.normalizedMetric) / 1.5}
		x={cachedProps.xOffset + linkEdgePadding / 4}
		y={branchYEnd +
			childSize / 2 -
			(childNode.specMetric.normalizedMetric < 0
				? 0
				: (childNode.specMetric.normalizedMetric * childSize) / 2)}
		height={(Math.abs(childNode.specMetric.normalizedMetric) * childSize) / 2}
		width={treeWidth / 200}
	/>

	<g style="--y-off: {childrenYOffset}px; --x-off: {cachedProps.xOffset + 0.5}px">
		<BrokenFittedText text={childNode.name} width={vizInfo.width} height={childSize} />
	</g>

	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<rect
		x={cachedProps.xOffset + linkEdgePadding}
		y={branchYEnd}
		fill-opacity="0"
		height={childSize}
		width={vizInfo.width}
		on:mouseover={treeInteract('highlight', id, cachedProps.xOffset, branchYEnd)}
		on:mouseleave={treeInteract('de-highlight', id, 0, 0)}
		on:click={treeInteract('toggle-select', id, 0, 0)}
	/>

	{#if childNode.children}
		<svelte:self
			{...cachedProps}
			{qcSpec}
			{attributeLabels}
			{visibleTreeInfo}
			{selectionState}
			{levelVisuals}
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
</style>
