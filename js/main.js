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
