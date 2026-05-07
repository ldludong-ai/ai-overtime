const MAIN_DURATION_SECONDS = getNumberParam("duration", 12 * 60);
const EXTRA_DURATION_SECONDS = getNumberParam("extra", 5 * 60);

const state = {
  participantId: makeParticipantId(),
  condition: getCondition(),
  startedAt: new Date().toISOString(),
  currentScreen: "consent",
  consent: null,
  consentAt: null,
  profile: {},
  taskViewedAt: null,
  writingStartedAt: null,
  writingEndedAt: null,
  writingTimer: null,
  mainTaskTimeSeconds: 0,
  finishedEarly: false,
  draftText: "",
  mediator: {},
  mediatorSubmittedAt: null,
  choseContinue: null,
  choiceAt: null,
  extraStartedAt: null,
  extraEndedAt: null,
  extraTimer: null,
  extraTimeSeconds: 0,
  revisionSubmittedEarly: null,
  finalText: "",
  posttest: {},
  finishedAt: null,
  clickLog: [],
  assistantClickLog: [],
  textSnapshots: []
};

const screens = ["consent", "profile", "task", "writing", "mediator", "choice", "extra", "posttest", "finish", "decline"];
const progressSteps = ["consent", "profile", "task", "writing", "mediator", "choice", "posttest"];
const qs = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
  initializePage();
  renderProfile();
  renderSupportPanels();
  renderMediator();
  renderPosttest();
  bindConsent();
  bindNavigation();
  bindSubmissionRetry();
});

function initializePage() {
  qs("#participant-label").textContent = `编号 ${state.participantId}`;
  qs("#condition-label").textContent = `系统已分配作业支持模块`;
  qs("#main-duration-label").textContent = formatDurationText(MAIN_DURATION_SECONDS);
  qs("#timer-main").textContent = formatClock(MAIN_DURATION_SECONDS);
  qs("#timer-extra").textContent = formatClock(EXTRA_DURATION_SECONDS);
}

function bindConsent() {
  document.querySelectorAll("input[name='consent']").forEach((input) => {
    input.addEventListener("change", () => {
      qs("#btn-consent").disabled = false;
    });
  });
}

function bindNavigation() {
  qs("#btn-consent").addEventListener("click", () => {
    const selected = document.querySelector("input[name='consent']:checked");
    if (!selected) return;
    state.consent = selected.value;
    state.consentAt = new Date().toISOString();
    recordClick(`consent_${selected.value}`);
    if (selected.value === "no") {
      showScreen("decline");
      return;
    }
    showScreen("profile");
  });

  qs("#btn-profile-next").addEventListener("click", () => {
    if (!collectProfile()) return;
    recordClick("profile_continue");
    showScreen("task");
  });

  qs("#btn-task-next").addEventListener("click", () => {
    state.taskViewedAt = new Date().toISOString();
    recordClick("task_start_writing");
    showScreen("writing");
    startWriting();
  });

  qs("#btn-finish-writing").addEventListener("click", () => {
    const confirmed = window.confirm("确认完成正式作业并进入课堂练习体验评价吗？");
    if (!confirmed) return;
    recordClick("finish_writing_early");
    finishMainWriting(true);
  });

  qs("#btn-mediator-next").addEventListener("click", () => {
    if (!collectForm("#mediator-form", state.mediator)) return;
    state.mediatorSubmittedAt = new Date().toISOString();
    recordClick("mediator_submit");
    showScreen("choice");
  });

  qs("#btn-submit-now").addEventListener("click", () => {
    state.choseContinue = false;
    state.choiceAt = new Date().toISOString();
    state.finalText = state.draftText;
    state.extraTimeSeconds = 0;
    state.revisionSubmittedEarly = null;
    recordClick("submit_now");
    showScreen("posttest");
  });

  qs("#btn-continue").addEventListener("click", () => {
    state.choseContinue = true;
    state.choiceAt = new Date().toISOString();
    recordClick("choose_continue");
    showScreen("extra");
    startExtraWriting();
  });

  qs("#btn-finish-extra").addEventListener("click", () => {
    recordClick("finish_extra_early");
    finishExtraWriting(true);
  });

  qs("#btn-posttest-submit").addEventListener("click", () => {
    if (!collectForm("#posttest-form", state.posttest)) return;
    state.finishedAt = new Date().toISOString();
    state.finalText = state.choseContinue ? qs("#extra-editor").value : state.finalText;
    recordClick("posttest_submit");
    showFinish();
  });
}

function renderProfile() {
  qs("#profile-form").innerHTML = `
    ${selectField("major", "你的专业是：", [
      ["", "请选择"],
      ["economics", "经济学"],
      ["financial_engineering", "金融工程"],
      ["business_administration", "工商管理"],
      ["marketing", "市场营销"],
      ["information_management", "信息管理/管理科学"],
      ["other", "其他"]
    ])}
    ${selectField("grade", "你的年级是：", [
      ["", "请选择"],
      ["freshman", "大一"],
      ["sophomore", "大二"],
      ["junior", "大三"],
      ["senior", "大四"],
      ["graduate", "研究生"],
      ["other", "其他"]
    ])}
    ${selectField("genai_ever_used", "你是否使用过生成式 AI 工具？", [
      ["", "请选择"],
      ["never", "从未使用过"],
      ["used", "使用过"]
    ])}
    ${selectField("genai_use_frequency", "你目前使用生成式 AI 工具的频率是：", [
      ["", "请选择"],
      ["never", "从未使用过"],
      ["less_than_monthly", "少于每月一次"],
      ["monthly_1_3", "每月 1-3 次"],
      ["weekly_1_2", "每周 1-2 天"],
      ["weekly_3_4", "每周 3-4 天"],
      ["daily_or_almost_daily", "每天或几乎每天"],
      ["multiple_times_daily", "每天多次"]
    ])}
  `;
}

function renderSupportPanels() {
  qs("#support-sidebar").innerHTML = supportHtml(state.condition, "writing");
  qs("#extra-sidebar").innerHTML = supportHtml(state.condition, "extra");
  bindSupportButtons();
}

function supportHtml(condition, phase) {
  if (condition === "ai") return aiSupportHtml(phase);
  return controlSupportHtml();
}

function aiSupportHtml(phase) {
  const prefix = `ai-${phase}`;
  return `
    <h2>作业支持模块</h2>
    <p class="support-intro">如果你在写作过程中遇到困难，可以查看以下思路提示。提示内容仅用于帮助理解任务，最终方案需要你独立完成。</p>
    <div class="support-button-list">
      ${supportButton(prefix, "target", "查看目标参与者提示")}
      ${supportOutput(prefix, "target", "当然可以。你可以先把目标参与者进一步细分，而不是只写“大学生”。例如：宿舍闲置物品较多的学生、关注环保的学生、希望低成本获得物品的新生、喜欢校园活动和社交互动的学生。写作时可以选择其中一类或两类作为方案重点。")}
      ${supportButton(prefix, "theme", "查看活动主题提示")}
      ${supportOutput(prefix, "theme", "可以从几个方向展开：环保、交换、校园故事、低成本生活。可参考的主题包括：“让闲置重新流动”“把不用的物品换成新的故事”“低碳校园，从一次交换开始”“旧物新生市集”。你可以选择一个主题，并结合活动目的进行调整。")}
      ${supportButton(prefix, "channels", "查看推广方式提示")}
      ${supportOutput(prefix, "channels", "建议采用线上和线下结合的方式。线上路径可以包括校园公众号、班级群、社团群、朋友圈；线下路径可以包括宿舍楼海报、社团联合宣传、摊位预告、旧物展示角。你可以将一种线上方式和一种线下方式组合起来，使推广方案更完整。")}
      ${supportButton(prefix, "attraction", "查看参与设计提示")}
      ${supportOutput(prefix, "attraction", "可以加入一些降低参与门槛、提高参与意愿的机制。例如：提前预约摊位、交换成功获得纪念贴纸、捐赠物品获得公益证书、设置“最有故事旧物”展示。你可以选择其中一种机制写入方案，并说明它如何吸引同学参与。")}
    </div>
  `;
}

function controlSupportHtml() {
  const rows = [
    ["目标参与者", "目标参与者可以进一步细分，不宜只写“大学生”。例如，宿舍闲置物品较多的学生、关注环保的学生、希望低成本获得物品的新生、喜欢校园活动和社交互动的学生，均可作为方案重点。"],
    ["活动主题或核心创意", "活动主题可以围绕环保、交换、校园故事、低成本生活等方向展开。可参考的主题包括：“让闲置重新流动”“把不用的物品换成新的故事”“低碳校园，从一次交换开始”“旧物新生市集”。"],
    ["推广方式", "推广方式可采用线上和线下结合。线上路径包括校园公众号、班级群、社团群、朋友圈；线下路径包括宿舍楼海报、社团联合宣传、摊位预告、旧物展示角。"],
    ["提高参与意愿的设计", "参与机制应降低参与门槛并提高参与意愿。可参考的设计包括：提前预约摊位、交换成功获得纪念贴纸、捐赠物品获得公益证书、设置“最有故事旧物”展示。"]
  ];
  return `
    <h2>作业提示与示例</h2>
    <p class="support-intro">完成校园活动推广方案时，可参考以下作业提示与示例。</p>
    ${rows
      .map(
        ([title, body]) => `
        <div class="support-block">
          <h3>${title}</h3>
          <p>${body}</p>
        </div>
      `
      )
      .join("")}
    <div class="support-block">
      <h3>评分关注点</h3>
      <p>评分时将关注方案是否结构完整、创意清晰、推广方式具体、参与设计具有吸引力。</p>
    </div>
  `;
}

function supportButton(prefix, key, label) {
  return `<button class="support-button" type="button" data-support="${prefix}-${key}">${label}</button>`;
}

function supportOutput(prefix, key, text) {
  return `<div id="${prefix}-${key}" class="support-output">${text}</div>`;
}

function bindSupportButtons() {
  document.querySelectorAll("[data-support]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-support");
      const output = qs(`#${id}`);
      output.classList.toggle("show");
      const isOpen = output.classList.contains("show");
      const entry = {
        id,
        label: button.textContent.trim(),
        action: isOpen ? "open" : "close",
        at: new Date().toISOString(),
        screen: state.currentScreen
      };
      state.assistantClickLog.push(entry);
      recordClick(`support_${id}_${entry.action}`);
    });
  });
}

function renderMediator() {
  const wdi = [
    ["wdi_1", "在完成这项推广方案时，我感到任务还可以继续扩展。"],
    ["wdi_2", "我感到这项任务还有很多细节可以进一步补充。"],
    ["wdi_3", "我感到这项任务可以做得比基本要求更完整。"],
    ["wdi_4", "我感到如果继续投入时间，方案质量还可以明显提高。"],
    ["wdi_5", "我感到辅助内容让我意识到更多需要处理的内容。"]
  ];
  const tc = [
    ["tc_1", "我感到自己能够控制完成这项任务的节奏。"],
    ["tc_2", "我感到自己能够判断这项任务什么时候可以停止。"],
    ["tc_3", "我感到自己能够合理安排这项任务的时间投入。"],
    ["tc_4", "我感到自己可以决定是否把额外时间用于继续修改。"],
    ["tc_5", "我感到辅助内容帮助我更快形成思路，从而更能掌控任务进度。"]
  ];
  qs("#mediator-form").innerHTML = `
    <div class="subsection-title">任务体验</div>
    ${wdi.map(renderLikert).join("")}
    <div class="subsection-title">时间安排体验</div>
    ${tc.map(renderLikert).join("")}
  `;
}

function renderPosttest() {
  const likertQuestions = [
    ["genai_like_1", "我觉得刚才的辅助内容像是围绕本次任务临时生成的建议。"],
    ["genai_like_2", "我觉得刚才的辅助内容具有生成式 AI 辅助的特征。"],
    ["genai_like_3", "我觉得刚才的辅助内容能够根据本次任务提供有针对性的思路。"],
    ["info_amount", "我觉得辅助内容的信息量较多。"],
    ["support_clarity", "我觉得辅助内容表达清楚。"],
    ["task_difficulty", "我觉得这项任务难度适中。"]
  ];

  qs("#posttest-form").innerHTML = `
    ${likertQuestions.map(renderLikert).join("")}
    ${selectField("support_identification", "你认为刚才看到的辅助内容更接近哪一种？", [
      ["", "请选择"],
      ["generated_ai_suggestions", "根据任务即时生成的建议"],
      ["course_materials", "普通课程资料或评分提示"],
      ["uncertain", "不确定"]
    ], "full")}
    <div class="field-row full">
      <label for="purpose_guess">你认为本次课堂练习主要想了解什么？</label>
      <textarea id="purpose_guess" name="purpose_guess" required></textarea>
    </div>
  `;
}

function renderLikert([name, title]) {
  const options = Array.from({ length: 7 }, (_, index) => index + 1)
    .map(
      (value) => `
      <label>
        <input type="radio" name="${name}" value="${value}" required />
        <span>${value}</span>
      </label>
    `
    )
    .join("");
  return `
    <div class="question-block">
      <div class="question-title">${title}</div>
      <div class="likert-row">${options}</div>
      <div class="scale-note">
        <span>非常不同意</span>
        <span>非常同意</span>
      </div>
    </div>
  `;
}

function selectField(name, label, options, className = "") {
  return `
    <div class="field-row ${className}">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" required>
        ${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}
      </select>
    </div>
  `;
}

function collectProfile() {
  return collectForm("#profile-form", state.profile);
}

function collectForm(formSelector, target) {
  const form = qs(formSelector);
  if (!form.reportValidity()) return false;
  const data = new FormData(form);
  Object.keys(target).forEach((key) => delete target[key]);
  for (const [key, value] of data.entries()) {
    target[key] = value;
  }
  return true;
}

function startWriting() {
  if (state.writingStartedAt) return;
  state.writingStartedAt = new Date().toISOString();
  const editor = qs("#report-editor");
  editor.value = "";
  editor.focus();
  bindEditor(editor, "#word-count");
  state.writingTimer = startCountdown(MAIN_DURATION_SECONDS, qs("#timer-main"), () => finishMainWriting(false));
}

function finishMainWriting(finishedEarly) {
  if (state.writingEndedAt) return;
  clearTimer("writingTimer");
  state.writingEndedAt = new Date().toISOString();
  state.finishedEarly = Boolean(finishedEarly);
  state.mainTaskTimeSeconds = secondsBetween(state.writingStartedAt, state.writingEndedAt);
  state.draftText = qs("#report-editor").value;
  state.textSnapshots.push({
    label: "draft",
    at: state.writingEndedAt,
    text: state.draftText,
    wordCount: countWords(state.draftText)
  });
  showScreen("mediator");
}

function startExtraWriting() {
  state.extraStartedAt = new Date().toISOString();
  const editor = qs("#extra-editor");
  editor.value = state.draftText;
  editor.focus();
  bindEditor(editor, "#extra-word-count");
  state.extraTimer = startCountdown(EXTRA_DURATION_SECONDS, qs("#timer-extra"), () => finishExtraWriting(false));
}

function finishExtraWriting(submittedEarly) {
  if (state.extraEndedAt) return;
  clearTimer("extraTimer");
  state.extraEndedAt = new Date().toISOString();
  state.revisionSubmittedEarly = Boolean(submittedEarly);
  state.extraTimeSeconds = secondsBetween(state.extraStartedAt, state.extraEndedAt);
  state.finalText = qs("#extra-editor").value;
  state.textSnapshots.push({
    label: "final_extra",
    at: state.extraEndedAt,
    text: state.finalText,
    wordCount: countWords(state.finalText)
  });
  showScreen("posttest");
}

function bindEditor(editor, countSelector) {
  const update = () => {
    qs(countSelector).textContent = `${countWords(editor.value)} 字`;
    if (countSelector === "#word-count") {
      qs("#save-status").textContent = `已记录 ${new Date().toLocaleTimeString()}`;
    }
  };
  editor.addEventListener("input", update);
  update();
}

function showFinish() {
  state.finalText = state.choseContinue ? qs("#extra-editor").value : state.finalText;
  state.textSnapshots.push({
    label: "final",
    at: state.finishedAt,
    text: state.finalText,
    wordCount: countWords(state.finalText)
  });
  showScreen("finish");
  submitResponse();
}

function showScreen(name) {
  state.currentScreen = name;
  screens.forEach((screen) => {
    const el = qs(`#screen-${screen}`);
    if (el) el.classList.toggle("active", screen === name);
  });
  updateProgress(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress(name) {
  const mappedName = {
    extra: "choice",
    finish: "posttest",
    decline: "consent"
  }[name] || name;
  const currentIndex = progressSteps.indexOf(mappedName);
  document.querySelectorAll(".progress-strip span").forEach((step) => {
    const stepName = step.getAttribute("data-step");
    const stepIndex = progressSteps.indexOf(stepName);
    step.classList.toggle("active", stepName === mappedName);
    step.classList.toggle("done", currentIndex >= 0 && stepIndex >= 0 && stepIndex < currentIndex);
  });
}

function buildExportData() {
  const finalText = state.choseContinue ? qs("#extra-editor").value : state.finalText;
  const draftWordCount = countWords(state.draftText);
  const finalWordCount = countWords(finalText);
  return {
    ...state,
    finalText,
    metrics: {
      draftWordCount,
      finalWordCount,
      addedWordCount: finalWordCount - draftWordCount,
      textLengthChange: finalText.length - state.draftText.length,
      mainTaskTimeSeconds: state.mainTaskTimeSeconds,
      extraTimeSeconds: state.extraTimeSeconds,
      assistantClickCount: state.assistantClickLog.length,
      work_demand_intensification: meanFields(state.mediator, ["wdi_1", "wdi_2", "wdi_3", "wdi_4", "wdi_5"]),
      time_control: meanFields(state.mediator, ["tc_1", "tc_2", "tc_3", "tc_4", "tc_5"]),
      genai_assistance_check: meanFields(state.posttest, ["genai_like_1", "genai_like_2", "genai_like_3"])
    }
  };
}

function bindSubmissionRetry() {
  const retryButton = qs("#btn-retry-submit");
  if (!retryButton) return;
  retryButton.addEventListener("click", () => {
    recordClick("retry_submit");
    submitResponse();
  });
}

async function submitResponse() {
  const payload = buildExportData();
  setSubmissionState("pending", "正在提交数据", "请不要关闭页面，系统正在保存你的作答记录。", false);
  try {
    await sendResponse(payload);
    setSubmissionState("success", "提交成功", "你的作答记录已保存。感谢你的参与！", false);
  } catch (error) {
    cachePendingSubmission(payload, error);
    setSubmissionState(
      "error",
      "暂未完成自动提交",
      `${error.message}。本次作答已暂存在当前浏览器中，请联系研究人员或稍后点击“重新提交”。`,
      true
    );
  }
}

async function sendResponse(payload) {
  const config = getStorageConfig();
  if (config.storageMode === "supabase") {
    return sendToSupabase(config, payload);
  }
  if (config.storageMode === "generic") {
    return sendToGenericEndpoint(config, payload);
  }
  throw new Error("尚未配置自动收集端点");
}

async function sendToGenericEndpoint(config, payload) {
  if (!config.genericEndpoint) throw new Error("尚未配置 genericEndpoint");
  const response = await fetch(config.genericEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`数据提交失败：HTTP ${response.status}`);
}

async function sendToSupabase(config, payload) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("尚未配置 Supabase URL 或匿名密钥");
  }
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/${config.supabaseTable}`;
  const row = buildSupabaseRow(payload);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`数据提交失败：HTTP ${response.status}${message ? ` ${message}` : ""}`);
  }
}

function buildSupabaseRow(payload) {
  return {
    participant_id: payload.participantId,
    condition: payload.condition,
    consent: payload.consent,
    started_at: payload.startedAt,
    finished_at: payload.finishedAt,
    profile: payload.profile || {},
    mediator: payload.mediator || {},
    posttest: payload.posttest || {},
    metrics: payload.metrics || {},
    click_log: payload.clickLog || [],
    assistant_click_log: payload.assistantClickLog || [],
    text_snapshots: payload.textSnapshots || [],
    draft_text: payload.draftText || "",
    final_text: payload.finalText || "",
    payload
  };
}

function getStorageConfig() {
  return {
    storageMode: "none",
    genericEndpoint: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseTable: "experiment2_responses",
    ...(window.EXPERIMENT2_CONFIG || {})
  };
}

function setSubmissionState(type, title, message, allowRetry) {
  const panel = qs("#submission-panel");
  const titleEl = qs("#submission-title");
  const messageEl = qs("#submission-message");
  const retryButton = qs("#btn-retry-submit");
  if (!panel || !titleEl || !messageEl || !retryButton) return;
  panel.classList.remove("pending", "success", "error");
  panel.classList.add(type);
  titleEl.textContent = title;
  messageEl.textContent = message;
  retryButton.classList.toggle("hidden", !allowRetry);
}

function cachePendingSubmission(payload, error) {
  const key = "experiment2_pending_submissions";
  const pending = JSON.parse(window.localStorage.getItem(key) || "[]");
  pending.push({
    cachedAt: new Date().toISOString(),
    error: error.message,
    payload
  });
  window.localStorage.setItem(key, JSON.stringify(pending));
}

function buildFlatExport() {
  const exported = buildExportData();
  return {
    participantId: exported.participantId,
    condition: exported.condition,
    consent: exported.consent,
    startedAt: exported.startedAt,
    taskViewedAt: exported.taskViewedAt,
    writingStartedAt: exported.writingStartedAt,
    writingEndedAt: exported.writingEndedAt,
    finishedEarly: exported.finishedEarly,
    choseContinue: exported.choseContinue,
    choiceAt: exported.choiceAt,
    extraStartedAt: exported.extraStartedAt,
    extraEndedAt: exported.extraEndedAt,
    revisionSubmittedEarly: exported.revisionSubmittedEarly,
    finishedAt: exported.finishedAt,
    ...exported.profile,
    ...exported.mediator,
    ...exported.posttest,
    ...exported.metrics,
    draftText: exported.draftText,
    finalText: exported.finalText,
    assistantClickLog: exported.assistantClickLog.map((item) => `${item.at}:${item.id}:${item.action}`).join("|"),
    clickLog: exported.clickLog.map((item) => `${item.at}:${item.label}`).join("|")
  };
}

function startCountdown(seconds, target, done) {
  let remaining = seconds;
  target.textContent = formatClock(remaining);
  const interval = window.setInterval(() => {
    remaining -= 1;
    target.textContent = formatClock(Math.max(0, remaining));
    if (remaining <= 0) {
      window.clearInterval(interval);
      done();
    }
  }, 1000);
  return interval;
}

function clearTimer(timerKey) {
  if (state[timerKey]) {
    window.clearInterval(state[timerKey]);
    state[timerKey] = null;
  }
}

function recordClick(label) {
  state.clickLog.push({ label, at: new Date().toISOString(), screen: state.currentScreen });
}

function countWords(text) {
  const clean = (text || "").trim();
  if (!clean) return 0;
  const cjk = clean.match(/[\u4e00-\u9fff]/g) || [];
  const words = clean
    .replace(/[\u4e00-\u9fff]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return cjk.length + words.length;
}

function meanFields(source, keys) {
  const values = keys.map((key) => Number(source[key])).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function formatClock(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatDurationText(seconds) {
  if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
  return `${seconds} 秒`;
}

function secondsBetween(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 1000));
}

function getNumberParam(name, fallback) {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getCondition() {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("condition");
  if (forced === "ai" || forced === "control") return forced;
  return Math.random() < 0.5 ? "ai" : "control";
}

function makeParticipantId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `E2-${Date.now().toString(36).toUpperCase()}-${random}`;
}
