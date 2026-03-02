import { defineConfig } from "vitepress";

export default defineConfig({
	title: "wt",
	description: "A CLI tool for managing git worktrees",
	base: "/wt-cli/",
	appearance: "dark",

	head: [
		[
			"meta",
			{ name: "theme-color", content: "#7c3aed" },
		],
	],

	themeConfig: {
		nav: [
			{ text: "Guide", link: "/getting-started" },
			{ text: "Commands", link: "/commands" },
		],

		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Getting Started", link: "/getting-started" },
					{ text: "Commands", link: "/commands" },
					{ text: "Configuration", link: "/configuration" },
					{ text: "Shell Integration", link: "/shell-integration" },
					{ text: "Completions", link: "/completions" },
				],
			},
		],

		socialLinks: [
			{ icon: "github", link: "https://github.com/stabai/wt-cli" },
		],

		search: {
			provider: "local",
		},

		footer: {
			message: "Released under the MIT License.",
		},
	},
});
