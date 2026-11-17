# GitDepCommand

Wizleap-Inc の GitHub PR ページを開くと、本番反映用のコマンド `git dep {repo} {PR番号}` を
画面上部の中央に大きく固定表示する Chrome 拡張機能（Arc でも動く）。
表示をクリックするとコマンドがクリップボードにコピーされ、緑色で「✓ コピーしました」と出る。

例: `https://github.com/Wizleap-Inc/crm-expert/pull/10463` → `git dep ec 10463`

## 対象リポジトリ

| リポジトリ | repo |
|---|---|
| crm-expert | `ec` |
| crm-admin | `sd` |
| crm-market-holder | `mcb` |
| money-career-clients | `mcf` |
| wiz-console | `wc` |

`/pull/{番号}` 配下（Conversation / Commits / Checks / Files changed）すべてで表示する。
上記以外のリポジトリ・Wizleap-Inc 以外の owner・PR 以外のページでは何も出さない。

## インストール

1. Arc なら `arc://extensions`、Chrome なら `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」でこの `GitDepCommand` フォルダを選択

## 対応表・見た目の変更

`content.js` 冒頭の定数を編集し、拡張機能ページで更新（↻）ボタンを押して再読み込みする。

- `OWNER` — 対象の GitHub owner（`Wizleap-Inc`）
- `REPO_KEYS` — リポジトリ名 → `git dep` の第 1 引数。`~/.gitdevil.sh` の `dv_dep` と揃える
- `STYLE` — 表示位置（`:host` の `top` / `left`）や色・文字サイズ

## 仕組みのメモ

- GitHub はページ遷移をフルリロードせずに中身だけ差し替えるため、manifest では `https://github.com/*` 全体に注入し、
  `content.js` で URL を 0.5 秒ごとに見て表示・非表示・番号の更新をしている（Turbo の遷移イベントでも即時に反映）
- 遷移のたびに `<body>` が丸ごと差し替わるので、表示要素は `<html>` 直下に置き、Shadow DOM で GitHub の CSS から切り離している
- 下にスクロールすると GitHub の固定ヘッダー（PR タイトル）の中央に重なる。上部固定の表示なので仕様としている
