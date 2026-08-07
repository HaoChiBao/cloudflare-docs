/** Wires <Tabs>; auto-detects manual triggers vs. synthesized-from-TabItem mode. */

import { mount, initTabs } from "@cloudflare/nimbus-docs/client";

const TRIGGER_CLASS =
	"cursor-pointer px-4 py-2 text-sm font-medium leading-6 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-selected:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]";

let counter = 0;

function initTabContainer(container: HTMLElement): () => void {
	const id = `nb-tabs-${counter++}`;
	const syncKey = container.dataset.nbSyncKey;
	const tablist = container.querySelector<HTMLElement>("[role=tablist]");
	const indicator = container.querySelector<HTMLElement>(
		"[data-nb-tabs-indicator]",
	);

	// Scope to this container so a nested <Tabs>'s triggers don't flip the
	// parent into manual mode (or vice-versa), independent of mount order.
	const existingTriggers = Array.from(
		container.querySelectorAll("[data-nb-tabs-trigger]"),
	).filter((t) => (t as HTMLElement).closest("[data-nb-tabs]") === container);
	const synthesize = existingTriggers.length === 0;

	if (synthesize && tablist) {
		// Only this container's own panels — exclude a nested <Tabs>'s panels,
		// whose nearest [data-nb-tabs] ancestor is the inner container.
		const panels = Array.from(
			container.querySelectorAll<HTMLElement>("[data-nb-tabs-content]"),
		).filter((p) => p.closest("[data-nb-tabs]") === container);

		panels.forEach((panel, i) => {
			const label = panel.dataset.nbTabLabel ?? "Tab";
			const value = panel.dataset.nbTabValue;
			const btn = document.createElement("button");
			btn.role = "tab";
			btn.type = "button";
			btn.className = TRIGGER_CLASS;
			btn.textContent = label;
			btn.setAttribute("data-nb-tabs-trigger", "");
			if (value) btn.dataset.nbTabValue = value;

			const panelId = `${id}-panel-${i}`;
			const tabId = `${id}-tab-${i}`;
			btn.id = tabId;
			btn.setAttribute("aria-controls", panelId);
			panel.id = panelId;
			panel.setAttribute("aria-labelledby", tabId);

			if (indicator) {
				tablist.insertBefore(btn, indicator);
			} else {
				tablist.appendChild(btn);
			}
		});
	}

	const instance = initTabs({
		container,
		tabSelector: "[data-nb-tabs-trigger]",
		panelSelector: "[data-nb-tabs-content]",
		boundarySelector: "[data-nb-tabs]",
		indicator,
		sync: syncKey ? { key: `ui-synced-tabs__${syncKey}` } : undefined,
	});

	const urlParam = container.dataset.nbUrlParam;
	const triggers = Array.from(
		container.querySelectorAll<HTMLButtonElement>("[data-nb-tabs-trigger]"),
	).filter((trigger) => trigger.closest("[data-nb-tabs]") === container);
	const handleUrlSync = (event: Event) => {
		if (!urlParam || !(event.currentTarget instanceof HTMLButtonElement))
			return;
		const value = event.currentTarget.dataset.nbTabValue;
		if (!value) return;

		const url = new URL(window.location.href);
		if (event.currentTarget === triggers[0]) url.searchParams.delete(urlParam);
		else url.searchParams.set(urlParam, value);
		window.history.replaceState({}, "", url);
	};

	triggers.forEach((trigger) =>
		trigger.addEventListener("click", handleUrlSync),
	);

	if (urlParam) {
		const requestedValue = new URLSearchParams(window.location.search).get(
			urlParam,
		);
		const requestedTrigger = triggers.find(
			(trigger) => trigger.dataset.nbTabValue === requestedValue,
		);
		requestedTrigger?.click();
	}

	return () => {
		triggers.forEach((trigger) =>
			trigger.removeEventListener("click", handleUrlSync),
		);
		instance.destroy();
		// Remove synthesized triggers so re-mount doesn't double up.
		if (synthesize && tablist) {
			tablist
				.querySelectorAll("[data-nb-tabs-trigger]")
				.forEach((b) => b.remove());
		}
	};
}

mount("[data-nb-tabs]", initTabContainer);
