<script lang="ts">
	import { fade } from 'svelte/transition';

	import type { QcSpec, LevelVisElem, FilterSpec } from '$lib/tree-types';
	import BrokenFittedText from './BrokenFittedText.svelte';

	export let lVis: LevelVisElem;
	export let index: number;
	export let childRate: number;
	export let overHangRate: number;
	export let sideBarWidth: number;
	export let svgWidth: number;
	export let currentQcSpec: QcSpec;
	export let filterSpecs: FilterSpec[];

	export let metricOptions: string[] = ['RCA A', 'Another longer named thing'];
	export let selectedMetric: string;

	export let maxOnOneLevel: number = 15;

	$: bif = currentQcSpec?.bifurcations[index];
	$: topOffset = lVis.topOffset + lVis.totalSize - lVis.totalSize * (childRate + overHangRate);
	$: fullHeight = lVis.totalSize * childRate;
	$: padSize = sideBarWidth * 0.02;
	$: numScale = (fullHeight * 0.22) / 28;
	$: optionScale = Math.min(
		(fullHeight * 0.22) / 28,
		sideBarWidth / (18 * 0.65 * metricOptions.reduce((l, r) => (l > r.length ? l : r.length), 0))
	);
</script>

{#if bif != undefined}
	<g transition:fade={{ duration: 1000 }} style="--y-off: {topOffset}px; --x-off: {0}px">
		<rect fill="grey" fill-opacity="0.3" height={fullHeight} width={svgWidth} />
		<g style="--y-off: {fullHeight * 0.25}px; --x-off: {padSize}px">
			<BrokenFittedText
				text={currentQcSpec?.bifurcations[index]?.description || ''}
				width={sideBarWidth}
				height={fullHeight * 0.22}
			/>
		</g>

		{#if bif.available_metrics?.length}
			<g style="--y-off: {fullHeight * 0.4}px; --x-off: {padSize}px">
				<foreignObject width="500" height="200" transform="scale({optionScale},{optionScale})">
					<select bind:value={selectedMetric}>
						{#each metricOptions as value}<option {value}>{value}</option>{/each}
					</select>
				</foreignObject>
			</g>
		{/if}

		<g style="--y-off: {fullHeight * 0.72}px; --x-off: {padSize}px">
			<foreignObject width="60" height="35" transform="scale({numScale},{numScale})">
				<input type="number" bind:value={filterSpecs[index].top_n} min="1" max={maxOnOneLevel} />
			</foreignObject>
		</g>
	</g>
{/if}

<style>
	rect {
		transition: 0.8s;
	}

	g {
		transition: transform 0.8s;
		transform: translate(var(--x-off), var(--y-off));
	}
	input {
		font-size: 18px;
		height: 28px;
		width: 50px;
	}

	select {
		font-size: 18px;
		border-style: solid;
		border-color: var(--color-metric-base);
		border-radius: 5px;
		border-width: 3.5px;
	}
</style>
