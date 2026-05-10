const DEBUG_TIMING = new URLSearchParams(window.location.search).get("debug") === "1";
const MAIN_DURATION_SECONDS = getNumberParam("duration", 15 * 60);
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
  choiceDecision: null,
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
const progressSteps = ["consent", "profile", "task", "writing", "choice", "mediator", "posttest"];
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
  bindCreditSubmission();
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
    const confirmed = window.confirm("确认完成正式作业并进入提交选择吗？");
    if (!confirmed) return;
    recordClick("finish_writing_early");
    finishMainWriting(true);
  });

  qs("#btn-mediator-next").addEventListener("click", () => {
    if (!collectForm("#mediator-form", state.mediator)) return;
    state.mediatorSubmittedAt = new Date().toISOString();
    recordClick("mediator_submit");
    if (state.choseContinue) {
      showScreen("extra");
      startExtraWriting();
      return;
    }
    showScreen("posttest");
  });

  qs("#btn-choice-submit").addEventListener("click", () => {
    const form = qs("#choice-form");
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const selected = data.get("choice_decision");
    state.choiceDecision = selected;
    state.choseContinue = selected === "continue";
    state.choiceAt = new Date().toISOString();
    if (!state.choseContinue) {
      state.finalText = state.draftText;
      state.extraTimeSeconds = 0;
      state.revisionSubmittedEarly = null;
    }
    recordClick(state.choseContinue ? "choose_continue" : "submit_now");
    showScreen("mediator");
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
  return controlSupportHtml(phase);
}

function aiSupportHtml(phase) {
  const prefix = `ai-${phase}`;
  if (phase === "extra") return aiRevisionSupportHtml(prefix);
  return `
    <h2>智能助手</h2>
    <p class="support-intro">如果你在写作过程中遇到困难，可以向智能助手请求帮助。智能助手只提供思路提示，最终方案需要你独立完成。</p>
    <div class="support-button-list">
      ${supportButton(prefix, "target", "帮我明确目标参与者")}
      ${supportOutput(prefix, "target", "当然可以。你可以先把目标参与者进一步细分，而不是只写“大学生”。例如：宿舍闲置物品较多的学生、关注环保的学生、希望低成本获得物品的新生、喜欢校园活动和社交互动的学生。写作时可以选择其中一类或两类作为方案重点。")}
      ${supportButton(prefix, "theme", "帮我想一个活动主题")}
      ${supportOutput(prefix, "theme", "可以从几个方向展开：环保、交换、校园故事、低成本生活。可参考的主题包括：“让闲置重新流动”“把不用的物品换成新的故事”“低碳校园，从一次交换开始”“旧物新生市集”。你可以选择一个主题，并结合活动目的进行调整。")}
      ${supportButton(prefix, "channels", "帮我扩展推广方式")}
      ${supportOutput(prefix, "channels", "建议采用线上和线下结合的方式。线上路径可以包括校园公众号、班级群、社团群、朋友圈；线下路径可以包括宿舍楼海报、社团联合宣传、摊位预告、旧物展示角。你可以将一种线上方式和一种线下方式组合起来，使推广方案更完整。")}
      ${supportButton(prefix, "attraction", "帮我增强参与吸引力")}
      ${supportOutput(prefix, "attraction", "可以加入一些降低参与门槛、提高参与意愿的机制。例如：提前预约摊位、交换成功获得纪念贴纸、捐赠物品获得公益证书、设置“最有故事旧物”展示。你可以选择其中一种机制写入方案，并说明它如何吸引同学参与。")}
      ${supportButton(prefix, "improve", "帮我检查还有哪些地方可以完善")}
      ${supportOutput(prefix, "improve", "你可以检查方案是否已经具体说明了推广渠道、触达对象和参与机制。如果某一部分仍然比较概括，可以进一步补充执行方式、时间安排或吸引同学参与的理由。")}
      ${supportButton(prefix, "creative-polish", "帮我优化表达和创意")}
      ${supportOutput(prefix, "creative-polish", "可以尝试让主题、推广方式和参与机制之间形成更清楚的联系。例如先突出“旧物重新流动”的主题，再说明线上预热、线下展示和交换奖励如何共同吸引同学参与。")}
    </div>
  `;
}

function aiRevisionSupportHtml(prefix) {
  return `
    <h2>智能助手</h2>
    <p class="support-intro">你已经完成初稿。现在可以围绕完整性、具体性和表达清晰度继续自查和完善。</p>
    <div class="support-button-list">
      ${supportButton(prefix, "structure", "帮我检查结构是否完整")}
      ${supportOutput(prefix, "structure", "可以先检查四个要求是否都已经出现：目标参与者、活动主题或核心创意、两项具体推广方式、一项提高参与意愿的设计。如果某一部分只是简单提到，可以补一句说明它为什么适合本次旧物交换与环保市集。")}
      ${supportButton(prefix, "specificity", "帮我把推广方式写具体")}
      ${supportOutput(prefix, "specificity", "可以把推广方式从“线上宣传、线下宣传”改得更可执行。例如写清楚使用校园公众号、班级群、宿舍楼海报或社团摊位预告，并补充发布时间、触达对象或现场呈现方式。")}
      ${supportButton(prefix, "participation", "帮我优化参与机制")}
      ${supportOutput(prefix, "participation", "可以检查参与机制是否真的降低门槛。比如说明如何预约摊位、如何提醒同学提前整理物品、交换或捐赠后能获得什么反馈，让同学更容易从“知道活动”转向“愿意参加”。")}
      ${supportButton(prefix, "polish", "帮我润色整体表达")}
      ${supportOutput(prefix, "polish", "可以把方案整理成更清楚的顺序：先写面向谁，再写主题，再写推广方式，最后写参与机制。检查句子是否有重复、是否过于笼统，并把关键行动写得更直接。")}
    </div>
  `;
}

function controlSupportHtml(phase) {
  if (phase === "extra") {
    const revisionRows = [
      ["结构完整性", "自查方案是否包含目标参与者、活动主题或核心创意、两项具体推广方式、一项提高参与意愿的设计。缺少的部分可以补充一两句。"],
      ["推广方式具体性", "检查推广方式是否写清楚渠道、对象或执行方式。例如校园公众号、班级群、宿舍楼海报、社团摊位预告等可以写得更具体。"],
      ["参与机制可行性", "检查参与机制是否能降低参与门槛，例如预约摊位、提前整理提醒、交换纪念贴纸、公益证书或旧物故事展示。"],
      ["表达清晰度", "检查段落顺序是否清楚、句子是否重复、核心创意和行动安排是否容易理解。"]
    ];
    return `
      <h2>自查与完善清单</h2>
      <p class="support-intro">你已经完成初稿。继续完善时，可参考以下检查点。</p>
      ${revisionRows
        .map(
          ([title, body]) => `
          <div class="support-block">
            <h3>${title}</h3>
            <p>${body}</p>
          </div>
        `
        )
        .join("")}
    `;
  }

  const rows = [
    ["目标参与者", "目标参与者可以进一步细分，不宜只写“大学生”。例如，宿舍闲置物品较多的学生、关注环保的学生、希望低成本获得物品的新生、喜欢校园活动和社交互动的学生，均可作为方案重点。"],
    ["活动主题或核心创意", "活动主题可以围绕环保、交换、校园故事、低成本生活等方向展开。可参考的主题包括：“让闲置重新流动”“把不用的物品换成新的故事”“低碳校园，从一次交换开始”“旧物新生市集”。"],
    ["推广方式", "推广方式可采用线上和线下结合。线上路径包括校园公众号、班级群、社团群、朋友圈；线下路径包括宿舍楼海报、社团联合宣传、摊位预告、旧物展示角。"],
    ["提高参与意愿的设计", "参与机制应降低参与门槛并提高参与意愿。可参考的设计包括：提前预约摊位、交换成功获得纪念贴纸、捐赠物品获得公益证书、设置“最有故事旧物”展示。"],
    ["完善检查", "完成初稿后，可以检查方案是否已经具体说明推广渠道、触达对象和参与机制。如果某一部分仍然比较概括，可以进一步补充执行方式、时间安排或吸引同学参与的理由。"],
    ["表达和创意优化", "可以让主题、推广方式和参与机制之间形成更清楚的联系。例如先突出“旧物重新流动”的主题，再说明线上预热、线下展示和交换奖励如何共同吸引同学参与。"]
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
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-support");
      const output = qs(`#${id}`);
      if (!output) return;
      output.classList.toggle("show");
      const isOpen = output.classList.contains("show");
      button.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) output.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  showScreen("choice");
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
    extra: "mediator",
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

function bindSubmissionRetry() {
  const retryButton = qs("#btn-retry-submit");
  if (!retryButton) return;
  retryButton.addEventListener("click", () => {
    recordClick("retry_submit");
    submitResponse();
  });
}

function bindCreditSubmission() {
  const button = qs("#btn-credit-submit");
  if (!button) return;
  button.addEventListener("click", submitCreditRecord);
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

async function submitCreditRecord() {
  const input = qs("#student-id");
  const messageEl = qs("#credit-message");
  const button = qs("#btn-credit-submit");
  const studentId = input.value.trim();
  if (!studentId) {
    messageEl.textContent = "请填写学号。";
    messageEl.className = "credit-message error";
    input.focus();
    return;
  }
  if (!state.finishedAt) {
    messageEl.textContent = "请先完成实验作答提交。";
    messageEl.className = "credit-message error";
    return;
  }

  button.disabled = true;
  messageEl.textContent = "正在提交学号...";
  messageEl.className = "credit-message pending";
  try {
    await sendCreditRecord(studentId);
    messageEl.textContent = "学号已提交，感谢参与。";
    messageEl.className = "credit-message success";
    input.disabled = true;
  } catch (error) {
    messageEl.textContent = `${error.message}。请稍后重试或联系研究人员。`;
    messageEl.className = "credit-message error";
    button.disabled = false;
  }
}

async function sendCreditRecord(studentId) {
  const config = getStorageConfig();
  if (config.storageMode !== "supabase") throw new Error("尚未配置学号登记端点");
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error("尚未配置 Supabase URL 或匿名密钥");
  const table = config.creditTable || "experiment2_credit_records";
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      participant_id: state.participantId,
      student_id: studentId,
      condition: state.condition,
      finished_at: state.finishedAt,
      experiment_version: "experiment2_absorption_extension_2026_05_09"
    })
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`学号提交失败：HTTP ${response.status}${message ? ` ${message}` : ""}`);
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
    creditTable: "experiment2_credit_records",
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
    choiceDecision: exported.choiceDecision,
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
  if (!DEBUG_TIMING) return fallback;
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

// Absorption-version measures for this copied static build.
function renderMediator() {
  const demandItems = [
    ["wdi_1", "为了完成本次任务，我感到需要在有限时间内处理较多内容。"],
    ["wdi_2", "本次任务需要我同时兼顾多个方面，例如目标参与者、活动主题、推广方式和参与机制。"],
    ["wdi_3", "我感到需要自己规划这份方案的写作思路和完成步骤。"],
    ["wdi_4", "我感到需要自己判断这份方案是否已经达到任务要求。"],
    ["wdi_5", "我感到需要根据页面中的辅助内容调整或更新自己的写作思路。"],
    ["wdi_6", "我感到本次任务需要投入较多思考、整理和检查。"]
  ];
  const absorptionItems = [
    ["task_absorption_1", "在本次任务中，我完全专注于手头的任务。"],
    ["task_absorption_2", "在本次任务中，我感到自己身心合一。"],
    ["task_absorption_3", "在本次任务中，我对时间流逝的感觉与平时不同。"],
    ["task_absorption_4", "在本次任务中，我发现这个体验本身非常有价值。"]
  ];

  qs("#mediator-form").innerHTML = `
    <div class="subsection-title">任务要求体验</div>
    ${demandItems.map(renderLikert).join("")}
    <div class="subsection-title">任务吸收体验</div>
    ${absorptionItems.map(renderLikert).join("")}
  `;
}

function renderPosttest() {
  const likertQuestions = [
    ["genai_like_1", "我觉得刚才的辅助内容像是由智能助手根据任务要求生成的建议。"],
    ["genai_like_2", "我觉得刚才的辅助内容具有生成式 AI 辅助的特征。"],
    ["material_clarity", "页面提供的辅助内容容易理解。"],
    ["page_operation_clarity", "本次任务页面的操作比较清楚。"]
  ];

  qs("#posttest-form").innerHTML = `
    ${likertQuestions.map(renderLikert).join("")}
    ${selectField("support_identification", "你认为刚才看到的辅助内容更接近哪一种？", [
      ["", "请选择"],
      ["generated_ai_suggestions", "智能助手根据任务生成的建议"],
      ["course_materials", "普通课程资料或评分提示"],
      ["uncertain", "不确定"]
    ], "full")}
  `;
}

function buildExportData() {
  const finalText = state.choseContinue ? qs("#extra-editor").value : state.finalText;
  const draftWordCount = countWords(state.draftText);
  const finalWordCount = countWords(finalText);
  return {
    ...state,
    finalText,
    experimentVersion: "experiment2_absorption_extension_2026_05_09",
    metrics: {
      draftWordCount,
      finalWordCount,
      addedWordCount: finalWordCount - draftWordCount,
      textLengthChange: finalText.length - state.draftText.length,
      mainTaskTimeSeconds: state.mainTaskTimeSeconds,
      extraTimeSeconds: state.extraTimeSeconds,
      assistantClickCount: state.assistantClickLog.length,
      work_demand_intensification: meanFields(state.mediator, [
        "wdi_1",
        "wdi_2",
        "wdi_3",
        "wdi_4",
        "wdi_5",
        "wdi_6"
      ]),
      task_absorption: meanFields(state.mediator, [
        "task_absorption_1",
        "task_absorption_2",
        "task_absorption_3",
        "task_absorption_4"
      ]),
      genai_assistance_check: meanFields(state.posttest, ["genai_like_1", "genai_like_2"]),
      material_equivalence: meanFields(state.posttest, ["material_clarity"]),
      page_experience: meanFields(state.posttest, ["page_operation_clarity"])
    }
  };
}
