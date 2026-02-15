/**
 * ホワイトペーパーフォーム自動入力（money-career.com/white_paper/guide1 〜 guide{n} 対応）
 * アイコンクリックで即実行。失敗時のみアラートを表示する。
 */

const FORM_VALUES = {
  'お名前（姓）': '中島',
  'お名前（名）': '楓人',
  'お名前（姓カナ）': 'ナカジマ',
  'お名前（名カナ）': 'フウト',
  'メールアドレス': 'futo.nakajima@wizleap.co.jp',
  '電話番号': '08067213051'
};

/** name / id から FORM_VALUES のキーへの対応（このサイトのフォーム構造用） */
const INPUT_ID_NAME_TO_LABEL_KEY = {
  lastname: 'お名前（姓）',
  firstname: 'お名前（名）',
  'lastname-kana': 'お名前（姓カナ）',
  'firstname-kana': 'お名前（名カナ）',
  email: 'メールアドレス',
  tel: '電話番号'
};

/**
 * ページで実行する用の「自己完結した1つの関数」。
 * executeScript ではこの関数だけが注入されるため、中で使う処理はすべてこの中に書く。
 */
function fillFormInPage(fieldMap, idNameMap) {
  function normalizeLabelText(text) {
    return (String(text || '').replace(/\s+/g, '')).trim();
  }
  function getInputFromLabel(label) {
    if (label.htmlFor) {
      const el = document.getElementById(label.htmlFor);
      if (el && /^(input|textarea|select)$/i.test(el.tagName)) return el;
    }
    const inner = label.querySelector('input, textarea, select');
    if (inner) return inner;
    let next = label.nextElementSibling;
    if (next && /^(input|textarea|select)$/i.test(next.tagName)) return next;
    if (next) {
      const inNext = next.querySelector('input, textarea, select');
      if (inNext) return inNext;
    }
    const parent = label.parentElement;
    if (parent) {
      const candidates = parent.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
      for (const el of candidates) {
        if (!label.contains(el) && (label.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return el;
      }
    }
    return null;
  }
  function setValueAndDispatch(input, value) {
    if (!input || input.disabled) return;
    const tag = input.tagName.toLowerCase();
    if (tag === 'select') {
      const opt = Array.from(input.options).find(o => o.value === value || o.text === value);
      if (opt) input.selectedIndex = Array.from(input.options).indexOf(opt);
    } else {
      input.value = value;
      input.focus();
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const normalizedKeys = {};
  Object.keys(fieldMap).forEach(k => { normalizedKeys[normalizeLabelText(k)] = fieldMap[k]; });

  const filled = [];
  function trySet(input, value) {
    if (!input || filled.includes(input)) return;
    setValueAndDispatch(input, value);
    filled.push(input);
  }

  if (idNameMap) {
    const nameOrId = (el) => el.getAttribute('name') || el.getAttribute('id') || '';
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').forEach(input => {
      const key = idNameMap[nameOrId(input)];
      if (key && fieldMap[key] !== undefined) trySet(input, fieldMap[key]);
    });
  }

  document.querySelectorAll('label').forEach(label => {
    const text = normalizeLabelText(label.textContent);
    for (const [key, value] of Object.entries(normalizedKeys)) {
      if (text === key || text.includes(key) || key.includes(text)) {
        const input = getInputFromLabel(label);
        if (input) {
          trySet(input, value);
          return;
        }
      }
    }
  });

  document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').forEach(input => {
    if (filled.includes(input)) return;
    const wrapper = input.closest('div, li, p, td, th, section');
    if (!wrapper) return;
    const labelLike = wrapper.querySelector('label, span, div');
    let raw = labelLike ? normalizeLabelText(labelLike.textContent) : '';
    if (!raw && wrapper.previousElementSibling) {
      const prevLabel = wrapper.previousElementSibling.querySelector('label, span, div');
      raw = prevLabel ? normalizeLabelText(prevLabel.textContent) : '';
    }
    for (const [key, value] of Object.entries(normalizedKeys)) {
      if (raw === key || raw.includes(key)) {
        trySet(input, value);
        return;
      }
    }
    const placeholder = (input.getAttribute('placeholder') || '').replace(/\s+/g, '');
    const name = (input.getAttribute('name') || '').replace(/\s+/g, '');
    const ariaLabel = (input.getAttribute('aria-label') || '').replace(/\s+/g, '');
    for (const [key, value] of Object.entries(normalizedKeys)) {
      const k = key.replace(/\s+/g, '');
      if (placeholder.includes(k) || name.includes(k) || ariaLabel.includes(k)) {
        trySet(input, value);
        return;
      }
    }
  });

  return filled.length;
}

/**
 * 調査用: ページ内のラベル数・入力欄数・サンプルテキストを返す（失敗時デバッグ用）
 */
function diagnoseFormPage() {
  const labels = document.querySelectorAll('label');
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
  const sampleLabelTexts = Array.from(labels).slice(0, 6).map(l => (l.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  const sampleInputNames = Array.from(inputs).slice(0, 6).map(i => (i.getAttribute('name') || i.getAttribute('placeholder') || i.getAttribute('aria-label') || '').slice(0, 30));
  return {
    labelCount: labels.length,
    inputCount: inputs.length,
    sampleLabelTexts,
    sampleInputNames,
    location: window.location.href
  };
}

const WHITE_PAPER_GUIDE_PATTERN = /\/white_paper\/guide/i;

function runFillOnTab(tabId, showAlertOnFailure) {
  return chrome.scripting
    .executeScript({
      target: { tabId, allFrames: true },
      func: fillFormInPage,
      args: [FORM_VALUES, INPUT_ID_NAME_TO_LABEL_KEY]
    })
    .then(results => {
      const totalCount = (results || []).reduce((sum, r) => sum + (r.result ?? 0), 0);
      return { totalCount, results };
    })
    .catch(e => {
      if (showAlertOnFailure) throw e;
      return { totalCount: 0 };
    });
}

// */white_paper/guide* に遷移したら自動でフォームを埋める
chrome.webNavigation.onCompleted.addListener(details => {
  if (details.frameId !== 0) return;
  if (!WHITE_PAPER_GUIDE_PATTERN.test(details.url)) return;
  const tabId = details.tabId;
  setTimeout(() => runFillOnTab(tabId, false).catch(() => {}), 1500);
}, { url: [{ urlMatches: '.*/white_paper/guide.*' }] });

chrome.action.onClicked.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }
    if (!tab.url || !/^https?:/.test(tab.url)) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: ['このページでは実行できません']
      });
      return;
    }

    // メインフレーム＋iframe 内も検索
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillFormInPage,
      args: [FORM_VALUES, INPUT_ID_NAME_TO_LABEL_KEY]
    });

    const totalCount = (results || []).reduce((sum, r) => sum + (r.result ?? 0), 0);
    if (totalCount === 0) {
      // 失敗時: メインフレームのページ構造を取得してアラートで表示（調査用）
      const parts = ['対象の入力欄が見つかりませんでした。'];
      try {
        const diagResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: diagnoseFormPage
        });
        const d = diagResults?.[0]?.result;
        if (d) {
          parts.push(`診断: ラベル=${d.labelCount}個, 入力欄=${d.inputCount}個`);
          if (d.sampleLabelTexts && d.sampleLabelTexts.length > 0) {
            parts.push('ラベル例: ' + d.sampleLabelTexts.join(' / '));
          } else if (d.inputCount > 0 && d.sampleInputNames?.length) {
            const names = d.sampleInputNames.filter(Boolean).join(', ') || '(なし)';
            parts.push('name等: ' + names);
          }
        }
      } catch (_) {
        parts.push('診断の取得に失敗しました');
      }
      parts.push('（ホワイトペーパーの詳細ページでお試しください）');
      const message = parts.join('\n');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: [message]
      });
    }
  } catch (e) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: ['エラー: ' + (e.message || '実行に失敗しました')]
      });
    }
  }
});
