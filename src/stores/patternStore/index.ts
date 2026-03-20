import { ref, reactive, computed } from "vue";
import type { ComputedRef } from "vue";
import { defineStore } from "pinia";
import { Pattern, defaultPattern } from "@/models/Pattern/Pattern";
import { Rule } from "@/models/Rule/Rule";
import {
	getUserPatternList,
	setUserPatternList,
} from "./utils/handle-user-data";
import { ElNotification } from "@/plugin/element-plus";

export default defineStore("PatternStore", () => {
	// s 方案列表
	const list = ref<Pattern[]>([defaultPattern]);

	// f 获取用户方案信息
	function getUserPatternInfo() {
		list.value = [defaultPattern];
		const userPatternList: Pattern[] = getUserPatternList();
		list.value.push(...userPatternList);
	}

	// f 保存(设置)用户方案信息
	function saveUserPatternInfo() {
		// s 使用备份数据进行存储
		setUserPatternList(list.value);
	}

	// 当前使用的方案信息
	const used = reactive({
		id: "#",
	});

	// f 获取初始方案id
	function setInitPattern() {
		let targetPattern: Pattern | null = null;

		const matchedPatterns: Pattern[] = list.value.filter((p) => {
			if (p.id.includes("#")) return false;
			// s 先过滤域名
			return p.mainInfo.matchHost.some((host) => {
				return new RegExp(`${host}`).test(location.origin);
			});
		});
		if (matchedPatterns.length) {
			// s 在路径过滤
			for (let i = 0; i < matchedPatterns.length; i++) {
				const pattern = matchedPatterns[i];

				if (pattern.mainInfo.filter.expression.trim().length > 0) {
					// 如果过滤器表达式不为空则进行匹配判断
					const expression = pattern.mainInfo.filter.expression;
					const flags = [
						...new Set(["g", ...pattern.mainInfo.filter.flags]),
					].join("");

					let regex: RegExp;

					try {
						regex = new RegExp(expression, flags);
					} catch (e) {
						console.error(e);
						continue;
					}
					let isMatch: boolean = false;
					if (!regex) {
						isMatch = true;
					} else {
						isMatch = regex.test(location.pathname + location.search);
					}

					if (isMatch) {
						targetPattern = pattern;
						break;
					}
				} else {
					// 过滤器表达式为空直接将当前方案定为目标方案
					targetPattern = pattern;
					break;
				}
			}
			// console.log(targetPattern);
			if (!targetPattern) {
				targetPattern = defaultPattern;
			}
		}
		console.log("初始方案", targetPattern);
		if (targetPattern) {
			used.id = targetPattern.id;
			editing.pid = targetPattern.id;
			if (targetPattern.rules.length) {
				editing.rid = targetPattern.rules[0].id;
			}
			// return targetPattern.id;
			//? 初始化filter
			// initFilter(targetPattern);
		} else {
			// s 没有匹配到则使用默认规则
			used.id = "#";
			// return "#";
		}
	}

	// s 当前方案信息
	const current = reactive({
		id: "#",
	});

	// s 当前编辑中的方案信息
	const editing = reactive({
		pid: "#", // 方案id
		rid: "", // 规则id (默认为空)
	});

	// 当前编辑的方案
	const editingPattern: ComputedRef<Pattern | undefined> = computed(() => {
		return findPattern(editing.pid);
	});

	// 查询方案
	function findPattern(id: string): Pattern | undefined {
		const pattern = list.value.find((pattern) => pattern.id === id);
		if (!pattern) return undefined;
		return pattern;
	}

	// 查询方案下标
	function findPatternIndex(id: string): number {
		const index = list.value.findIndex((pattern) => pattern.id === id);
		return index;
	}

	// 放置方案到指定位置
	function adjustPatternPosition(
		id: string,
		tid: string,
		position: "before" | "after" | "inner",
	) {
		const index = findPatternIndex(id);
		// 先取出要调整的方案
		const pattern = list.value.splice(index, 1)[0];
		// 再查询要放置的位置下标
		const dropIndex = findPatternIndex(tid);
		// 最后执行放置
		list.value.splice(dropIndex + (position === "after" ? 1 : 0), 0, pattern);
		// 先备份数据
		pattern.backupData();
		// 在存储数据
		saveUserPatternInfo();
	}

	// 当前编辑的规则
	const editingRule: ComputedRef<Rule | undefined> = computed(() => {
		const pattern = editingPattern.value; // 获取当前正则编辑的方案
		let rule = findRule(editing.rid, editing.pid); //根据id获取当前正在编辑的规则
		if (!rule && pattern && pattern.rules.length) {
			// 如果通过id未找到规则,但是方案存在且含有规则,则默认使用首个规则
			rule = pattern.rules[0];
		}
		return rule;
	});

	// 查询规则
	function findRule(ruleId: string, patternId: string): Rule | undefined {
		const pattern = findPattern(patternId);
		if (!pattern) return undefined;
		const rule = pattern.rules.find((rule) => rule.id === ruleId);
		if (!rule) return undefined;
		return rule;
	}

	// 查询规则下标
	function findRuleIndex(ruleId: string, patternId: string): number {
		const pattern = findPattern(patternId);
		if (!pattern) return -1;
		const index = pattern.rules.findIndex((rule) => rule.id === ruleId);
		return index;
	}

	// 查询规则所属的方案
	function findRulePattern(ruleId: string): Pattern | undefined {
		return list.value.find((pattern) => {
			return pattern.rules.find((rule) => rule.id === ruleId);
		});
	}

	// 放置规则到指定位置
	function adjustRulePosition(
		id: string,
		tid: string,
		position: "before" | "after" | "inner",
	) {
		const pattern = findRulePattern(id);
		const targetPattern = findRulePattern(tid);
		if (!pattern || !targetPattern) throw "方案不存在";
		// 找出规则在原方案中的下标位置
		const index = findRuleIndex(id, pattern.id);
		// 先从原先方案中取出方案
		const rule = pattern.rules.splice(index, 1)[0];
		// 后查询要放入目标方案中的下标位置
		const dropIndex = findRuleIndex(tid, targetPattern.id);
		// console.log("dropIndex", dropIndex);
		// 插入到指定方案的相应下标中
		targetPattern.rules.splice(
			dropIndex + (position === "after" ? 1 : 0),
			0,
			rule,
		);
		// 先备份数据
		pattern.backupData();
		targetPattern.backupData();
		// 最后进行数据保存
		saveUserPatternInfo();
	}

	// 将当前规则放入指定方案中(末尾插入)
	function moveRuleToPattern(ruleId: string, patternId: string) {
		const nowPattern = findRulePattern(ruleId);
		const targetPattern = findPattern(patternId);
		if (!nowPattern || !targetPattern) throw "方案不存在";
		// 找出规则在原方案中的下标位置
		const index = findRuleIndex(ruleId, nowPattern.id);
		// 先从原先方案中取出方案
		const rule = nowPattern.rules.splice(index, 1)[0];
		// 插入到指定方案的相应下标中
		targetPattern.rules.push(rule);
		// 先备份数据
		nowPattern.backupData();
		targetPattern.backupData();
		saveUserPatternInfo();
	}

	// 获取当前方案
	function getCurrentPattern() {
		return findPattern(current.id);
	}

	// 创建方案
	function createPattern() {
		list.value.push(new Pattern());
		saveUserPatternInfo();
	}

	// 删除方案
	function deletePattern(id: string) {
		// 获取按方案下标
		const index = list.value.findIndex((pattern) => pattern.id === id);
		if (index >= 0) {
			const pattern = list.value.splice(index, 1)[0];
			// 如果被删除的方案是正在使用的方案则重新设置初始方案
			if (used.id === pattern.id) {
				setInitPattern();
			}
			saveUserPatternInfo();
		}
	}

	// 粘贴方案
	function pastePattern() {
		navigator.clipboard
			.readText()
			.then((dataStr) => {
				console.log("剪贴板文本：", dataStr);
				// 先尝试解析成一个对象
				let obj: any;
				try {
					obj = JSON.parse(dataStr);
				} catch (e) {
					ElNotification({
						type: "error",
						title: "失败",
						message: "剪贴板内容解析失败",
						appendTo: ".resource-extractor__notification",
					});
					return;
				}
				// 如果成功解析成对象,则进一步尝试解析为方案
				let pattern: Pattern | false = false;
				try {
					pattern = new Pattern(obj);
					// 如果成功解析为方案则添加为方案
					list.value.push(pattern);
					saveUserPatternInfo();
					ElNotification({
						type: "success",
						title: "成功",
						message: "成功解析为方案",
						appendTo: ".resource-extractor__notification",
					});
				} catch (e) {
					// 如果解析失败则提示错误
					ElNotification({
						type: "error",
						title: "失败",
						message: "剪贴板内容不符合方案的数据格式",
						appendTo: ".resource-extractor__notification",
					});
				}
			})
			.catch(() => {
				ElNotification({
					type: "error",
					title: "失败",
					message: "剪贴板内容读取失败",
					appendTo: ".resource-extractor__notification",
				});
			});
	}

	return {
		list,
		used,
		current,
		editing,
		editingPattern,
		editingRule,
		getUserPatternInfo,
		saveUserPatternInfo,
		setInitPattern,
		createPattern,
		deletePattern,
		pastePattern,
		findPattern,
		findPatternIndex,
		getCurrentPattern,
		adjustPatternPosition,
		adjustRulePosition,
		findRule,
		findRuleIndex,
		findRulePattern,
		moveRuleToPattern,
	};
});
