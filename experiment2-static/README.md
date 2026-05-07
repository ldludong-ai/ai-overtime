# 实验二静态网页

这是实验二“生成式 AI 辅助感 -> 感知工作要求强化/感知时间控制 -> 继续完善行为”的本地静态网页版本。

## 打开方式

直接在浏览器中打开：

```text
experiment2-static/index.html
```

无需安装依赖，也不需要启动服务器。

## 条件与计时参数

默认随机进入两组之一：

- `condition=ai`：生成式 AI 辅助组，侧栏呈现“智能助手”按钮，点击后显示预设提示，并记录点击日志。
- `condition=control`：普通课程支持组，侧栏静态展示“作业提示与示例”。

测试时可以通过 URL 参数强制条件与缩短时间：

```text
index.html?condition=ai&duration=30&extra=15
index.html?condition=control&duration=30&extra=15
```

其中 `duration` 为正式写作秒数，`extra` 为继续完善秒数。

## 流程

1. 课堂练习说明与知情同意。
2. 前置信息。
3. 共同任务材料。
4. 正式写作任务。
5. 课堂练习体验评价：在提交选择前测量中介题项。
6. 提交前检查：直接提交或继续完善。
7. 若继续完善，进入最多 5 分钟修改阶段。
8. 后测题项与目的猜测。
9. 结束页与测试导出。

## 数据自动收集

结束页不再向被试显示 JSON/CSV 导出。页面会在最后一页自动提交作答数据。

当前支持两种提交方式：

1. Supabase：推荐正式实验使用。
2. Generic endpoint：任意能接收 JSON POST 的 webhook 或后端接口。

配置文件为：

```text
experiment2-static/config.js
```

Supabase 配置示例：

```js
window.EXPERIMENT2_CONFIG = {
  storageMode: "supabase",
  genericEndpoint: "",
  supabaseUrl: "https://你的项目.supabase.co",
  supabaseAnonKey: "你的 anon public key",
  supabaseTable: "experiment2_responses"
};
```

建表 SQL 见：

```text
experiment2-static/supabase-schema.sql
```

如果 `storageMode` 仍为 `none`，页面会在结束页提示“尚未配置自动收集端点”，并把提交数据暂存在当前浏览器的 `localStorage` 中，便于测试排错。

自动提交的数据包含：

- `condition`
- 前置信息
- 初稿与终稿文本
- `choseContinue`
- `extraTimeSeconds`
- `addedWordCount`
- `textLengthChange`
- 中介题项均值
- 操控检查题项均值
- AI 组提示按钮点击日志

## 下载数据到本地

不要把 Supabase 的 `service_role` key 放进 `experiment2-static/config.js`，也不要提交到 GitHub。网页只使用 `anon public key` 插入数据；本地下载数据时才使用 `service_role` key。

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 填入：

```text
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
SUPABASE_TABLE=experiment2_responses
```

3. 下载数据：

```powershell
node scripts/download_supabase_experiment2.mjs
```

脚本会在 `data/` 目录生成一份完整 JSON 和一份扁平 CSV。CSV 可直接用于 Excel、SPSS、R 或 Stata 分析。
