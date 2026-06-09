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

  function setNav(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('is-open'));
    });

    // ナビ内のリンクを押したら閉じる（モバイルで遷移後にメニューが残らないように）
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
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
})();
