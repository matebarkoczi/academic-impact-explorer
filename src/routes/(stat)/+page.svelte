<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { INSTITUTION_TYPE } from '$lib/constants';
	import { handleStore } from '$lib/tree-functions';
	import type { SelectionOption } from '$lib/tree-types';
	import AutoComplete from 'simple-svelte-autocomplete';
	import { onMount } from 'svelte';

	let instOptions: SelectionOption[] = [];

	onMount(() => {
		handleStore('root-descriptions', (jsv) => {
			// @ts-ignore
			instOptions = jsv[INSTITUTION_TYPE];
		});
	});

	function onChange(e: SelectionOption | undefined) {
		if (e != undefined) {
			goto(`${base}/view/${INSTITUTION_TYPE}/${e.id}`);
		}
	}
</script>

<div class="bstrip t1">
	<div class="bar">
		<h1>Explore the impact of an academic institution!</h1>
		<AutoComplete
			className={'inst-selector'}
			inputClassName={'inst-input'}
			dropdownClassName={'inst-dropdown'}
			selectId={'inst-selected'}
			items={instOptions}
			{onChange}
			labelFieldName="name"
			valueFieldName="id"
			hideArrow={true}
		/>
	</div>
</div>

<style>
	h1 {
		text-align: center;
		margin-bottom: 20px;
	}

	.t1 {
		margin-top: 20px;
		background-color: rgba(var(--color-range-30), 0.15);
	}

	.bar {
		padding: 150px;
		flex: 0 1 700px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
	}

	:global(.inst-selector) {
		font-size: x-large;
		width: 100%;
	}
	:global(.inst-input) {
		background-color: rgba(var(--color-range-20), 0.1);
		border: 2px solid rgba(var(--color-range-55), 0.45);
		border-radius: 4px;
		width: 100%;
	}
	:global(.inst-dropdown) {
		background-color: rgba(var(--color-range-20), 0.1) !important;
		border: 2px solid rgba(var(--color-range-55), 0.45);
		border-radius: 4px;
	}

	:global(.selected) {
		text-decoration: underline;
		font-weight: bolder;
	}
</style>
