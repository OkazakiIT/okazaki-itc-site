/* ============================================================
   共通スクリプト  /  Sprint 6：ナビ機能・スクロール出現
   - defer 読み込みのため、実行時点で DOM は構築済み。
   - JS が無効/失敗しても本文が読めるよう、隠す処理は「JSが動いた時だけ」
     有効化する（先頭で .js クラスを付与し、CSSはそれを前提に隠す）。
   ============================================================ */
'use strict';

(function () {
  var root = document.documentElement;

  // JS有効の目印。CSSの出現アニメ用の「隠し」はこのクラスを前提にする。
  root.classList.add('js');

  // 視差効果を減らす設定なら、出現アニメ自体を無効化（即表示）。
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) root.classList.add('reduce');

  /* ---------- 「ページ先頭へ戻る」を確実に y=0 へ ----------
     フッターの Top ボタンとヘッダーのロゴ（どちらも href="#top"）を押した時、
     確実にドキュメント最上部へ戻す。id="top" は body 直下の非固定アンカーへ
     移したので純HTMLでも #top が最上部を指すが、scroll-margin や将来の構造変更に
     左右されず必ず y=0 に着地させるため JS でも明示的に scrollTo(0) する。
     reduced-motion 時は瞬時（auto）、それ以外はスムーズに。
     クリックは委譲（document 1か所）で、ロゴ／フッターどちらも・モバイル/PC両対応。 */
  document.addEventListener('click', function (e) {
    var topLink = e.target.closest('a[href="#top"]');
    if (!topLink) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    // URL のハッシュ(#top)も付与し、純HTMLと同等の状態に揃える（履歴を汚さない）。
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#top');
    }
  });

  /* ---------- ハンバーガーメニュー開閉 ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('global-nav');

  // D2：メニュー開閉。閉じる時、直前に開いていたら（＝モバイルで操作中なら）
  // フォーカスをハンバーガーボタンへ戻し、キーボード利用者の文脈を保つ。
  // 768px以上ではナビ常時表示・トグル非表示なので、フォーカスは戻さない
  // （戻すと見えないボタンへフォーカスが飛ぶため）。トグルの可視性で判定する。
  function focusToggleIfMobile() {
    // offsetParent が null＝display:none（768px以上）の時は戻さない。
    if (toggle.offsetParent !== null) toggle.focus();
  }

  // 第2引数 deferFocus=true のとき、フォーカス戻しを次フレームへ遅延する。
  // リンククリック閉では、ブラウザ既定のアンカー遷移が直後にフォーカスを
  // body 等へ移すため、それを上書きする形で確実にトグルへ戻すのが狙い。
  function setNav(open, deferFocus) {
    var wasOpen = nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');

    // 「開→閉」に遷移した時だけ、トグルが表示中（モバイル）ならフォーカスを戻す。
    if (wasOpen && !open) {
      if (deferFocus) {
        // アンカー遷移後にフォーカスを取り戻す（同期 focus は既定動作に上書きされる）。
        // rAF は非表示タブで止まるため、確実に走る setTimeout(0) を使う。
        window.setTimeout(focusToggleIfMobile, 0);
      } else {
        focusToggleIfMobile();
      }
    }
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('is-open'));
    });

    // ナビ内のリンクを押したら閉じる（モバイルで遷移後にメニューが残らないように）。
    // リンク活性化はアンカー遷移を伴うので、フォーカス戻しは遅延させる。
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false, true);
    });

    // Esc キーで閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
  }

  /* ---------- スクロールで出現（フェードイン） ---------- */
  // 対象：見出し・各カード・タイムライン・プロフィール・問い合わせ。
  // ※ヒーローは初期表示なので対象外（チラつき防止）。
  var revealSelector =
    '.section-head, .service-card, .work-card, .timeline__item, ' +
    '.about__figure, .about__body, .contact__card';
  var targets = document.querySelectorAll(revealSelector);

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // アニメ無し or 非対応：すべて即表示
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          obs.unobserve(en.target); // 一度出したら監視解除
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- メールアドレスのコピー（mailto が機能しない環境向けの保険） ----------
     既定のメールアプリが未設定のPCでは mailto を押しても何も起きないため、
     表示中アドレスをワンクリックでクリップボードへコピーできるようにする。
     - 第一候補: navigator.clipboard.writeText（HTTPS/localhost で動く標準API）
     - フォールバック: 画面外の textarea を選択して document.execCommand('copy')
       （旧ブラウザや、権限等で clipboard API が拒否された場合の保険）
     - 結果は role="status"（aria-live=polite）の .copy-status へ表示し、
       スクリーンリーダーにも読み上げられる。成功表示は約2秒で消す。
     ボタン自体は CSS の .js ゲートで「JSが動いた時だけ」表示される。 */
  var copyBtn = document.querySelector('.copy-btn');
  var copyStatus = document.querySelector('.copy-status');

  if (copyBtn && copyStatus) {
    var statusTimer = null;

    // 通知領域へメッセージを表示し、一定時間後に消す（連打時は表示時間を延長）。
    var showCopyStatus = function (message, isError) {
      copyStatus.textContent = message;
      copyStatus.classList.toggle('copy-status--error', !!isError);
      if (statusTimer) window.clearTimeout(statusTimer);
      // 成功は約2秒で消す。失敗の案内は読む時間が必要なので長めに残す。
      statusTimer = window.setTimeout(function () {
        copyStatus.textContent = '';
        copyStatus.classList.remove('copy-status--error');
      }, isError ? 6000 : 2000);
    };

    // フォールバック：textarea + execCommand('copy')。
    // 画面外固定配置でスクロールを動かさず、コピー後は即座に除去する。
    var legacyCopy = function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', ''); // モバイルでキーボードを出さない
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length); // iOS Safari 対策
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };

    copyBtn.addEventListener('click', function () {
      // コピーするのはアドレス文字列のみ（件名・空白などは含めない）。
      var text = copyBtn.getAttribute('data-copy-text') || '';

      var onSuccess = function () {
        showCopyStatus('コピーしました', false);
      };
      // clipboard API が使えない/拒否された場合はフォールバックを試し、
      // それも不可なら手動コピーを案内する（これ以上は複雑にしない）。
      var onFailure = function () {
        if (legacyCopy(text)) {
          onSuccess();
        } else {
          showCopyStatus(
            'コピーできませんでした。お手数ですがアドレスを選択してコピーしてください。',
            true
          );
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess, onFailure);
      } else {
        onFailure();
      }
    });
  }

  /* ---------- C1：ナビの現在地ハイライト（スクロールスパイ） ----------
     出現アニメ用 IO とは別管理。ビューポート内のセクションに対応する
     ナビリンクへ aria-current="page" を「同時に1つだけ」付与する。
     CSS 側でアクセント色＋（PCは）下線として控えめに見せる。
     IntersectionObserver 非対応や JS 無効時は何も付かない＝無害。 */
  if ('IntersectionObserver' in window) {
    // ナビリンク（#about 等）→ 対応セクションのマップを作る。
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll('.global-nav__list a[href^="#"]')
    );
    var linkBySectionId = {};
    var spySections = [];
    navLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) {
        linkBySectionId[id] = link;
        spySections.push(section);
      }
    });

    if (spySections.length) {
      // 現在ビューポート内にあるセクションIDの集合。
      var visibleIds = {};

      function updateCurrent() {
        // 表示中セクションのうち「最も上にある（＝固定ヘッダー直下に近い）」を現在地とする。
        // これにより同時に複数が見えていても active は常に1つに定まる。
        var currentId = null;
        var currentTop = Infinity;
        spySections.forEach(function (sec) {
          if (visibleIds[sec.id]) {
            var top = sec.getBoundingClientRect().top;
            if (top < currentTop) {
              currentTop = top;
              currentId = sec.id;
            }
          }
        });

        navLinks.forEach(function (link) {
          var id = link.getAttribute('href').slice(1);
          if (id === currentId) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }

      var spyIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            visibleIds[en.target.id] = true;
          } else {
            delete visibleIds[en.target.id];
          }
        });
        updateCurrent();
      }, {
        // 固定ヘッダー分だけ上端の判定ラインを下げ、画面中央寄りで現在地を切り替える。
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0
      });

      spySections.forEach(function (sec) { spyIO.observe(sec); });
    }
  }
})();
