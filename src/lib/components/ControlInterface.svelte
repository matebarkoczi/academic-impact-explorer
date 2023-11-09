<script lang="ts">
	import { fade } from 'svelte/transition';

	import type {
		QcSpec,
		LevelVisElem,
		ControlSpec,
		AttributeLabels,
		IndexEvent
	} from '$lib/tree-types';
	import BrokenFittedText from './BrokenFittedText.svelte';
	import AutoComplete from 'simple-svelte-autocomplete';
	import { createEventDispatcher } from 'svelte';

	export let lVis: LevelVisElem;
	export let index: number;
	export let expandedIndex: number | undefined;
	export let childRate: number;
	export let overHangRate: number;
	export let sideBarWidth: number;
	export let svgWidth: number;
	export let currentQcSpec: QcSpec;
	export let controlSpecs: ControlSpec[];

	export let attributeLabels: AttributeLabels;

	export let maxOnOneLevel: number = 15;

	const dispatch = createEventDispatcher<{ 'control-expand': IndexEvent }>();

	function expandThis(ind: number) {
		return () => {
			dispatch('control-expand', { ind });
		};
	}

	$: isExpanded = index == expandedIndex;
	$: bif = currentQcSpec?.bifurcations[index];
	$: topOffset = lVis.topOffset + lVis.totalSize - lVis.totalSize * (childRate + overHangRate);
	$: fullHeight = lVis.totalSize * childRate;
	$: leftPad = sideBarWidth * 0.02;

	$: mainOffset = isExpanded ? 0.23 : 0.32;
	$: mainControlHeight = fullHeight * (isExpanded ? 0.75 : 0.65);
	$: mainControlWidth = sideBarWidth * 0.85;

	$: mainScale = Math.min(
		mainControlHeight / (isExpanded ? 160 : 90),
		mainControlWidth / (isExpanded ? 320 : 220)
	);

	// let items = [];

	$: items = Object.entries(attributeLabels[bif?.attribute_kind] || {}).map(([i, e]) => ({
		id: i,
		name: e.name
	}));

	let possScaleTypes = ['volume', 'specialization'];
</script>

{#if bif != undefined}
	<g transition:fade={{ duration: 1000 }} style="--y-off: {topOffset}px; --x-off: {leftPad}px">
		<rect
			fill="grey"
			fill-opacity={isExpanded ? 0.5 : 0.3}
			x={-leftPad}
			height={fullHeight}
			width={svgWidth}
		/>
		<g style="--y-off: {fullHeight * 0.15}px;">
			<BrokenFittedText
				text={currentQcSpec?.bifurcations[index]?.description || ''}
				width={sideBarWidth * 0.9}
				height={fullHeight * 0.12}
			/>
		</g>

		<g style="--y-off: {fullHeight * mainOffset}px;">
			<foreignObject
				width={mainControlWidth / mainScale}
				height={mainControlHeight / mainScale}
				transform="scale({mainScale},{mainScale})"
			>
				<div class="main-controls">
					{#if isExpanded}
						<div class="sub-controls">
							<div class="sub-input">
								<div class="sub-label">Must include</div>
								<div>
									<AutoComplete
										{items}
										bind:value={controlSpecs[index].include}
										multiple={true}
										hideArrow={true}
										labelFieldName="name"
										valueFieldName="id"
										maxItemsToShowInList={3}
									/>
								</div>
							</div>
							<div class="sub-input">
								<div class="sub-label">Must exclude</div>
								<div>
									<AutoComplete
										{items}
										bind:value={controlSpecs[index].exclude}
										multiple={true}
										hideArrow={true}
										labelFieldName="name"
										valueFieldName="id"
										maxItemsToShowInList={3}
									/>
								</div>
							</div>
						</div>
					{/if}
					<button on:click={expandThis(index)}>{isExpanded ? 'Collapse' : 'Expand'}</button>
					<input
						id="top-limit"
						type="number"
						bind:value={controlSpecs[index].limit_n}
						min="1"
						max={maxOnOneLevel}
					/>
					<div>
						{#each possScaleTypes as scT}
							<label>
								<input
									type="radio"
									name="basis-{index}"
									value={scT}
									bind:group={controlSpecs[index].size_base}
								/>
								{scT}
							</label>
						{/each}
					</div>
					<div>
						{#each [true, false] as extremeSideTop}
							<label>
								<input
									type="radio"
									name="end-{index}"
									value={extremeSideTop}
									bind:group={controlSpecs[index].show_top}
								/>
								{extremeSideTop ? 'highest' : 'lowest'}
							</label>
						{/each}
					</div>
				</div>
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

	#top-limit {
		width: 35px;
	}

	.main-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
	}

	.main-controls > * {
		/* font-size: 10px; */
		margin: 3px;
	}

	.sub-input {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 3px;
	}

	.sub-label {
		padding-right: 20px;
	}
</style>
