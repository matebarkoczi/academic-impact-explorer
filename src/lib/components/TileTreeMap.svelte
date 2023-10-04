<script lang="ts">
	import { getColorArr } from '$lib/style-util';
	import type { TreeNode } from '$lib/tree-types';
	import BrokenFittedText from './BrokenFittedText.svelte';

	export let data: TreeNode;

	$: childVals = Object.values(data.children || {});
	$: sumW = childVals?.reduce((l, r) => l + r.weight, 0);

	const flats = [];

	function bsp(
		subc: TreeNode[],
		offsets: number[],
		sizes: number[],
		offsetIndex: number,
		scaleRate: number
	) {
		if (subc.length == 1) {
			return flats.push({ name: subc[0].name, offsets, sizes });
		}
		let sideSum = subc[0].weight * scaleRate;
		let i = 1;
		let e;
		while (i < subc.length - 1) {
			e = subc[i];
			sideSum += e.weight * scaleRate;
			if (sideSum > sizes[offsetIndex] / 2) {
				break;
			}
			i++;
		}

		const valAdder = (arr: number[], addval: number) =>
			arr.map((v, _i) => (_i == offsetIndex ? v + addval : v));

		const postOffsets = valAdder(offsets, sideSum);
		const postSizes = valAdder(sizes, -sideSum);
		const preSizes = sizes.map((v, _i) => (_i == offsetIndex ? sideSum : v));
		const newOffsetIndex = (offsetIndex + 1) % offsets.length;
		if (i > 0) {
			bsp(subc.slice(0, i), offsets, preSizes, newOffsetIndex, sizes[newOffsetIndex] / sideSum);
		}
		if (i < subc.length) {
			bsp(
				subc.slice(i),
				postOffsets,
				postSizes,
				newOffsetIndex,
				sizes[newOffsetIndex] / (sizes[offsetIndex] - sideSum)
			);
		}
	}

	$: bsp(childVals || [], [0, 0], [sumW, sumW], 0, 1);
</script>

<svg width="100%" height="100%" viewBox="0 0 {sumW} {sumW}">
	{#each flats as node, i}
		<g transform="translate({node.offsets[0]}, {node.offsets[1]})">
			<rect
				width={node.sizes[0]}
				height={node.sizes[1]}
				style="--crgb: {getColorArr(i / flats.length)}"
			/>
			<g transform="translate(0, {node.sizes[1]})">
				<BrokenFittedText text={node.name} width={node.sizes[0]} height={node.sizes[1]} />
			</g>
		</g>
	{/each}
</svg>

<style>
	rect {
		border: 30px solid black;
		fill: rgba(var(--crgb), 0.6);
	}
</style>
