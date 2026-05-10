# 实验二静态网页：任务吸收与时间延伸版本

这是实验二当前使用的任务吸收与时间延伸版本静态网页。旧版 `experiment2-static` 已从线上仓库移除，避免误进入旧问卷。

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
8. 后测题项：AI 辅助操控检验、材料理解性检查、页面操作清晰度、辅助内容识别。
9. 结束页与自动提交。
10. 可选学分登记：单独填写学号，保存到 `experiment2_credit_records`，不进入实验分析数据。

## 数据表

本版本当前提交到已创建的数据表：

```text
experiment2_responses
```

数据中包含 `experimentVersion = "experiment2_absorption_extension_2026_05_09"`，可用于区分本吸收扩展版本。若后续希望改用独立表，建表 SQL 见：

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
- `material_equivalence`（材料理解性检查）
- `page_experience`
- AI 组提示按钮点击日志

## 下载数据到本地

网页只使用 Supabase publishable/anon key 插入数据。不要把 `service_role` key 放进前端或提交到 GitHub。

1. 复制根目录 `.env.example` 为 `.env`。
2. 在 `.env` 中填入 Supabase `service_role` key，并确认：

```text
SUPABASE_TABLE=experiment2_responses
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

正式收数前，请确认 Supabase 中已创建 `experiment2_responses` 表，或先执行 `supabase-schema.sql` 并将 `config.js` 改为对应独立表名。

如需学分登记，请同时确认 Supabase 中已创建 `experiment2_credit_records` 表，并启用匿名插入策略。
可在 Supabase SQL Editor 执行：

```text
experiment2-absorption-static/credit-schema.sql
```

下载学号登记表：

```powershell
node scripts/download_credit_records.mjs
```
