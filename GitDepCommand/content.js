// Wizleap-Inc の PR ページで、本番反映用の `git dep {repo} {PR番号}` を画面上部に固定表示し、クリックでコピーさせる。
// GitHub はページ遷移をフルリロードせずに中身だけ差し替える（Turbo / React）ため、manifest では github.com 全体に注入し、
// ここで URL の変化を見張って表示・非表示・中身の更新をする。
// Turbo は遷移のたびに <body> を丸ごと差し替えるので、表示要素は <body> ではなく <html> 直下に置く。

const OWNER = "Wizleap-Inc";

// リポジトリ名 → git dep の第 1 引数（~/.gitdevil.sh の dv_dep と同じ対応）
const REPO_KEYS = {
  "crm-expert": "ec",
  "crm-admin": "sd",
  "crm-market-holder": "mcb",
  "money-career-clients": "mcf",
  "wiz-console": "wc",
};

const HOST_ID = "__git_dep_command__";
const POLL_MS = 500;
const COPIED_MS = 1500;

// /{owner}/{repo}/pull/{番号} とその配下（/files /commits /checks /changes など）だけを対象にする
const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

function currentTarget() {
  const m = location.pathname.match(PR_PATH);
  if (!m) return null;
  const [, owner, repo, pr] = m;
  if (owner.toLowerCase() !== OWNER.toLowerCase()) return null;
  const key = REPO_KEYS[repo.toLowerCase()];
  if (!key) return null;
  return { repo, pr, command: `git dep ${key} ${pr}` };
}

const STYLE = `
  :host {
    all: initial;
    position: fixed;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483000;
  }
  @media print { :host { display: none; } }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 0;
    padding: 6px 22px 8px;
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 12px;
    background: #1f6feb;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif;
    line-height: 1.2;
    transition: background 0.15s ease, transform 0.1s ease;
    -webkit-user-select: none;
    user-select: none;
  }
  button:hover { background: #388bfd; }
  button:active { transform: scale(0.97); }
  button:focus-visible { outline: 3px solid #ffd33d; outline-offset: 2px; }
  button.copied { background: #1a7f37; }
  button.failed { background: #cf222e; }
  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0.9;
    white-space: nowrap;
  }
  .cmd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 22px;
    font-weight: 700;
    white-space: nowrap;
  }
`;

let host = null;
let button = null;
let labelEl = null;
let cmdEl = null;
let shown = null; // 表示中の target（未表示なら null）
let resetTimer = null;

function build() {
  host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLE;

  button = document.createElement("button");
  button.type = "button";
  labelEl = document.createElement("span");
  labelEl.className = "label";
  cmdEl = document.createElement("span");
  cmdEl.className = "cmd";
  button.append(labelEl, cmdEl);
  button.addEventListener("click", onClick);

  shadow.append(style, button);
}

function idleLabel(target) {
  return `${target.repo} #${target.pr} ・ クリックでコピー`;
}

function render(target) {
  if (!host) build();
  if (!host.isConnected) document.documentElement.appendChild(host);
  if (shown && shown.command === target.command) return;
  shown = target;
  clearTimeout(resetTimer);
  button.classList.remove("copied", "failed");
  cmdEl.textContent = target.command;
  labelEl.textContent = idleLabel(target);
  button.title = `${target.command} をクリップボードにコピー`;
}

function hide() {
  if (host && host.isConnected) host.remove();
  shown = null;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // フォーカスが外れている等で Clipboard API が拒否されたときの保険
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
    document.documentElement.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

async function onClick() {
  if (!shown) return;
  const target = shown;
  const ok = await copyText(target.command);
  if (shown !== target) return;
  button.classList.remove("copied", "failed");
  button.classList.add(ok ? "copied" : "failed");
  labelEl.textContent = ok ? "✓ コピーしました" : "コピーに失敗しました";
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    if (shown !== target) return;
    button.classList.remove("copied", "failed");
    labelEl.textContent = idleLabel(target);
  }, COPIED_MS);
}

function sync() {
  const target = currentTarget();
  if (target) render(target);
  else hide();
}

sync();
setInterval(sync, POLL_MS);
// 遷移直後にすぐ反映させるためのイベント（取りこぼしてもポーリングで拾う）
for (const ev of ["turbo:load", "turbo:render", "pjax:end", "popstate"]) {
  document.addEventListener(ev, sync);
  window.addEventListener(ev, sync);
}
