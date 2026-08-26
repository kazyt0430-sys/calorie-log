Calorie Log - GitHub Pages 公開手順
====================================

【重要】
このZIPを展開したあと、ZIP自体ではなく「中のファイル」をGitHubリポジトリ直下へアップロードしてください。

1. GitHubで新しいリポジトリを作成
   例: calorie-log
   Public を選択（GitHub Pagesを簡単に試す場合）

2. 作成したリポジトリで
   Add file → Upload files
   を選択

3. このフォルダ内のファイルをすべてアップロード
   index.html がリポジトリの一番上に見える状態にします。

4. Commit changes を押す

5. リポジトリ上部の
   Settings → Pages
   を開く

6. Build and deployment の Source を
   Deploy from a branch
   にする

7. Branch を
   main / (root)
   にして Save

8. 1〜数分待つ
   Pages画面に公開URLが表示されます。
   例:
   https://ユーザー名.github.io/calorie-log/

9. iPhoneのSafariで公開URLを開く

10. ホーム画面へ追加する場合
    Safariの共有ボタン → ホーム画面に追加

【テストする項目】
・今日の残りkcalが表示される
・「食事を記録」から食品を追加できる
・追加後にkcal/P/F/Cが更新される
・体重を保存できる
・分析タブを表示できる
・Safariを閉じて開き直しても記録が残る

【注意】
・データは現時点ではiPhoneのSafari内(localStorage)に保存されます。
・別のiPhoneやPCとは同期しません。
・Safariのサイトデータを消すと記録も消えます。
・AI写真解析はまだデモ段階です。写真選択/撮影はできますが、本物のAI解析は次版で接続します。
