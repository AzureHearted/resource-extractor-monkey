import { fileURLToPath, URL } from "node:url";
// import path from "path";
// const pathSrc = path.resolve(__dirname, "src");
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// import VueDevTools from "vite-plugin-vue-devtools";

// 导入monkey插件
import monkey, { util } from "vite-plugin-monkey";
// 导入自定义monkey配置
import monkeyConfig from "./monkey.config";

// 自动按需引入配置
import components from "unplugin-vue-components/vite";
import autoImport from "unplugin-auto-import/vite";
// varlet组件库的自动引入配置
import { VarletImportResolver } from "@varlet/import-resolver";
// element-plus组件库的自动引入配置
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";

// s 用于在vue项目中使用svg文件
import svgLoader from "vite-svg-loader";

// s 打包分析插件
import { visualizer } from "rollup-plugin-visualizer";

// s NaiveUi配置
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		// VueDevTools(),
		// s 用于在vue项目中使用svg文件
		svgLoader(),
		// s 自动导入
		autoImport({
			resolvers: [
				VarletImportResolver({ autoImport: true }),
				ElementPlusResolver({
					importStyle: "sass",
				}),
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
				ElementPlusResolver({
					importStyle: "sass",
				}),
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
		}),
		// s 打包体积分析
		visualizer({
			open: true, //注意这里要设置为true，否则无效
			// gzipSize: true,
			// brotliSize: true,
		}),
		// s 油猴配置
		monkey(monkeyConfig),
	],
	css: {
		// 预处理器配置项
		preprocessorOptions: {
			scss: {
				// s element-plus的自定义前缀设置导入
				additionalData: `@use "@/styles/element/index.scss" as *;`,
			},
			less: {
				math: "always", // 启用 Less 预处理器中的数学运算功能
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
		target: "es2015",
		// 使用terser进行压缩混淆
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true, // s 删除所有 console
			},
		},
	},
});
