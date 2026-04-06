import { VarletImportResolver } from "@varlet/import-resolver"; // varlet组件库的自动引入配置
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { visualizer } from "rollup-plugin-visualizer"; // 打包分析插件
import autoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers"; // NaiveUi配置
import components from "unplugin-vue-components/vite"; // 自动按需引入配置
import { defineConfig } from "vite";
import monkey, { util } from "vite-plugin-monkey"; // monkey插件
import svgLoader from "vite-svg-loader"; // 用于在vue项目中使用svg文件
import monkeyConfig from "./monkey.config"; // 自定义monkey配置

// https://vitejs.dev/config/
export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(monkeyConfig.userscript?.version),
	},
	plugins: [
		vue(),
		// VueDevTools(),
		// s 用于在vue项目中使用svg文件
		svgLoader(),
		// s 自动导入
		autoImport({
			resolvers: [
				VarletImportResolver({ autoImport: true, directives: false }),
			],
			imports: [
				util.unimportPreset,
				{
					"naive-ui": [
						"useDialog",
						"useMessage",
						"useNotification",
						"useLoadingBar",
					],
				},
			],
			dts: "./types/auto-imports.d.ts",
		}),
		// s 组件自动导入
		components({
			resolvers: [
				VarletImportResolver(),
				NaiveUiResolver(),
				// 自动注册图标组件
				IconsResolver({
					prefix: "icon", //图标组件前缀,默认是“i”
				}),
			],
			dts: "./types/components.d.ts",
		}),
		// s 打包体积分析
		Icons({
			autoInstall: true,
			scale: 1,
			compiler: "vue3",
		}),
		// s 打包体积分析
		visualizer({
			open: true, //注意这里要设置为true，否则无效
			gzipSize: true,
			brotliSize: true,
		}),
		// s 油猴配置
		monkey(monkeyConfig),
	],
	css: {
		// 预处理器配置项
		preprocessorOptions: {
			scss: {
				additionalData: `
					@use "@/styles/theme.scss" as *;
				`,
			},
		},
	},
	resolve: {
		// s 路径别名设置
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@svg": fileURLToPath(new URL("./src/assets/svg", import.meta.url)),
		},
	},
	server: {
		open: false, // s 项目运行时不自动打开浏览器
	},
	// s 打包配置
	build: {
		target: "es2020",
		// 使用terser进行压缩混淆
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true, // s 删除所有 console
			},
		},
	},
});
