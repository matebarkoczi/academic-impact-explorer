<script lang="ts">
	import { formatTextToLines } from '$lib/text-format-util';

	export let text: string;
	export let width: number;
	export let height: number;
	export let anchor: string = 'left';

	$: brokenText = formatTextToLines(text, width, height);
</script>

{#each brokenText.lines as text, textInd}
	{#if brokenText.rotate}
		<text
			x={(textInd + 1) * brokenText.fontSize * 1.2}
			style="font-size: {brokenText.fontSize}px;"
			text-anchor={anchor}
			transform="rotate(270, {(textInd + 1) * brokenText.fontSize * 1.2}, 0)">{text}</text
		>
	{:else}
		<text
			y={(textInd - brokenText.lines.length + 1) * brokenText.fontSize * 1.2}
			style="font-size: {brokenText.fontSize}px;"
			text-anchor={anchor}>{text}</text
		>
	{/if}
{/each}

<style>
	text {
		transition: font-size 1s;
		font-family: 'Courier New', Courier, monospace;
	}
</style>
