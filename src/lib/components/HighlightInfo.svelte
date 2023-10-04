<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { HoveredInfo } from '$lib/tree-types';
	import { formatNumber } from '$lib/text-format-util';
	import BrokenFittedText from './BrokenFittedText.svelte';
	export let hInfo: HoveredInfo;
	export let sideBarWidth: number;

	$: wNum = hInfo?.weight || 0;
	$: width = sideBarWidth * 0.8;
	let height = 5;

	let y = 3;
</script>

{#if hInfo != undefined}
	<filter id="blurry">
		<feGaussianBlur in="SourceGraphic" stdDeviation={sideBarWidth * 0.008} />
	</filter>

	<rect
		transition:fade={{ duration: 200 }}
		x={sideBarWidth * 0.1}
		{y}
		{height}
		{width}
		rx={0.3}
		opacity={0.95}
		filter="url(#blurry)"
	/>
	<g transform="translate({sideBarWidth * 0.5}, {y + height * 0.25})">
		<BrokenFittedText
			text={hInfo?.name || ''}
			width={width * 0.9}
			height={height * 0.3}
			anchor={'middle'}
		/>
	</g>

	{#if hInfo.path?.length}
		<text class="hover-inner" x={sideBarWidth * 0.2} y={7.5}>
			{formatNumber(wNum)} citation{#if wNum > 1}s{/if}
		</text>
	{/if}

	{#if hInfo.metricName}
		<g transform="translate({sideBarWidth * 0.5}, {6.65})">
			<text class="hover-inner metric-value">
				{hInfo.metricName}
			</text>
			<text class="hover-inner metric-value" y={0.85}>
				{hInfo.metricValue?.toFixed(2)}
			</text>
		</g>
	{/if}
{/if}

<style>
	rect {
		fill: yellow;
		border-style: yellow;
		border-color: black;
		/* fill: var(--color-bg-0); */
	}

	.hover-inner {
		font-size: 0.6px;
	}

	.metric-value {
		fill: var(--color-metric-base);
	}

	rect {
		transition: 0.4s;
	}
</style>
