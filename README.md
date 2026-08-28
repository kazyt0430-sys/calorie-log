# Calorie Log

iPhone Safariで日常利用するための、追加ランニングコスト0円のカロリー・PFC管理Webアプリです。

## 使い方

GitHub Pagesなどの静的ホスティングにこのリポジトリ直下を公開します。端末内の `localStorage` に保存するため、外部DBや有料APIは不要です。

ローカル確認:

```powershell
& 'C:\Users\kt_43\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tests/core.test.js
```

## 主な機能

- 今日の摂取kcal、残りkcal、P/F/C残量
- 朝食・昼食・夕食・間食の食事記録
- 食品検索、食品追加、数量変更、削除
- お気に入り、最近使った食品、自分専用食品登録
- 日付切替、食事履歴、体重記録
- 7日分析、30日分析
- 目標カロリー・PFC設定、プロフィールから目安計算
- 残りkcal/PFCに基づく食事候補
- JSONバックアップ・復元
- 写真撮影/選択と食品候補選択
- 食事テンプレートの一括追加と保存
- 写真メモ
- PWA、ホーム画面追加、オフライン利用

## 写真機能

現時点では有料AI APIを使わず、撮影・選択した写真を見ながら候補食品を選ぶUXです。画像認識の差し替え口は `photo-recognition.js` に分離しています。
