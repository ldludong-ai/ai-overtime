# 实验二静态网页

本目录现在作为实验二的线上主入口，内容已替换为“任务吸收感”版本。历史版本不再保留在该入口中；如需对照，新版副本也同步保存在 `experiment2-absorption-static/`。

## 访问方式

本地打开：

```text
experiment2-static/index.html
```

正式参数示例：

```text
index.html?condition=ai&duration=15&extra=5
index.html?condition=control&duration=15&extra=5
```

调试参数示例：

```text
index.html?debug=1&condition=ai&duration=1&extra=1
index.html?debug=1&condition=control&duration=1&extra=1
```

## 当前流程

1. 知情说明与基本信息
2. 写作任务说明
3. 正式写作阶段
4. AI 辅助或普通参考材料呈现
5. 提交选择：直接提交或继续完善
6. 如选择继续完善，进入额外完善阶段
7. 任务体验与操控检验
8. 结束页

当前版本已经删除提交前检查题，也删除被迫性时间延伸和自主性时间延伸的 10 个结果题项。

## 数据表

默认写入 Supabase 表：

```text
experiment2_absorption_responses
```

建表 SQL：

```text
experiment2-static/supabase-schema.sql
```

下载数据脚本：

```powershell
node scripts/download_supabase_experiment2.mjs
```

下载脚本需要本地 `.env` 中提供 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。不要把 `service_role` key 提交到 GitHub。
