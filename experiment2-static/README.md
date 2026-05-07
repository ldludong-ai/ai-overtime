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

## 数据导出

结束页提供 JSON 和 CSV 导出，包含：

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
