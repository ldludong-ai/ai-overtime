# 实验二静态网页：任务吸收与时间延伸版本

这是实验二的新版本静态网页。原有 `experiment2-static` 保留不动；本目录为并行副本。

## 打开方式

直接在浏览器中打开：

```text
experiment2-absorption-static/index.html
```

无需安装依赖，也不需要启动服务器。

## 条件与计时参数

默认随机进入两组之一：

- `condition=ai`：智能助手组，侧栏呈现六个可点击的“帮我……”按钮，点击后显示对应思路，并记录点击日志。
- `condition=control`：普通课程支持组，侧栏一次性展示相同维度的“作业提示与示例”。

正式页面固定为 15 分钟正式写作和 5 分钟继续完善。`duration` 和 `extra` 只有在显式加入 `debug=1` 时才会生效。

测试链接示例：

```text
index.html?debug=1&condition=ai&duration=30&extra=15
index.html?debug=1&condition=control&duration=30&extra=15
```

## 流程

1. 课堂练习说明与知情同意。
2. 前置信息。
3. 共同任务材料。
4. 正式写作任务。
5. 提交选择：直接提交或继续完善。
6. 选择后体验评价：感知工作要求强化、任务吸收感。
7. 若继续完善，进入最多 5 分钟修改阶段。
8. 后测题项：AI 辅助操控检验、材料等价性、页面体验、辅助内容识别。
9. 结束页与自动提交。

## 数据表

本版本默认提交到独立表：

```text
experiment2_absorption_responses
```

建表 SQL 见：

```text
experiment2-absorption-static/supabase-schema.sql
```

## 主要变量

- `condition`
- `choseContinue`
- `choiceDecision`
- `extraTimeSeconds`
- `addedWordCount`
- `textLengthChange`
- `work_demand_intensification`
- `task_absorption`
- `genai_assistance_check`
- `material_equivalence`
- `page_experience`
- AI 组提示按钮点击日志

## 下载数据到本地

网页只使用 Supabase publishable/anon key 插入数据。不要把 `service_role` key 放进前端或提交到 GitHub。

1. 复制根目录 `.env.example` 为 `.env`。
2. 在 `.env` 中填入 Supabase `service_role` key，并确认：

```text
SUPABASE_TABLE=experiment2_absorption_responses
```

3. 在项目根目录运行：

```powershell
node scripts/download_supabase_experiment2.mjs
```

脚本会在本地 `data/` 目录生成 JSON 和 CSV，`data/` 已被 `.gitignore` 忽略。

## 配置

配置文件为：

```text
experiment2-absorption-static/config.js
```

正式收数前，请确认 Supabase 中已创建 `experiment2_absorption_responses` 表。
