/* Advent calendar — DOM controller.
   Classic script (no modules): the section loads advent-calendar.helpers.js
   first, then this file. All pure logic lives in window.AdventHelpers. */
(function () {
  var H = window.AdventHelpers;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
  var MOBILE_QUERY = '(max-width: 700px)';

  /* ---------------------------------------------------------------- init -- */

  function initAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.advent'), initSection);
  }

  function initSection(root) {
    if (root.dataset.adventReady) return;
    root.dataset.adventReady = '1';
    var sectionId = root.dataset.sectionId;
    var storageKey = 'advent-calendar:opened:' + sectionId;
    var opened = H.readOpened(window.localStorage, storageKey);
    var doors = Array.prototype.slice.call(root.querySelectorAll('.advent__door'));

    doors.forEach(function (door) {
      var day = Number(door.dataset.day);
      if ((door.dataset.state === 'past' || door.dataset.state === 'today') && opened.has(day)) {
        door.dataset.state = 'opened';
      }
    });

    var forced = H.parseDayParam(location.search);
    if (forced) {
      doors.forEach(function (door) {
        var day = Number(door.dataset.day);
        if (door.dataset.state === 'opened') return;
        if (day < forced) door.dataset.state = 'past';
        else if (day === forced) door.dataset.state = 'today';
      });
      root.dataset.forceDay = String(forced);
    }

    doors.forEach(function (door) {
      door.addEventListener('click', function () { onDoorClick(root, door, opened, storageKey); });
    });

    var onKey = function (e) { if (e.key === 'Escape') closeOverlay(root); };
    document.addEventListener('keydown', onKey);
    root._adventCleanup = function () {
      document.removeEventListener('keydown', onKey);
      closeOverlay(root, true);
      var portal = root.querySelector('.advent__portal');
      if (portal) {
        portal.hidden = true;
        while (portal.firstChild) portal.removeChild(portal.firstChild);
      }
      delete root.dataset.adventReady;
    };

    if (root.dataset.guides === 'true') {
      renderGuides(root, doors);
      var onResize = debounce(function () { renderGuides(root, doors); }, 150);
      window.addEventListener('resize', onResize);
      var prev = root._adventCleanup;
      root._adventCleanup = function () { prev(); window.removeEventListener('resize', onResize); };
    }
  }

  /* ----------------------------------------------------------- door click -- */

  function onDoorClick(root, door, opened, storageKey) {
    if (door.dataset.state === 'locked') {
      if (!reduce) {
        door.classList.add('advent__door--shake');
        setTimeout(function () { door.classList.remove('advent__door--shake'); }, 600);
      }
      return;
    }
    var day = Number(door.dataset.day);
    openOverlay(root, door, day);
    opened.add(day);
    H.writeOpened(window.localStorage, storageKey, opened);
    door.dataset.state = 'opened';
  }

  /* -------------------------------------------------------------- overlay -- */

  /* One overlay state object per section, parked on the root. */
  function overlayState(root) {
    if (!root._adventOverlay) root._adventOverlay = { open: false };
    return root._adventOverlay;
  }

  /* Build the scrim / card / close button once, then reuse them. */
  function ensureShell(root) {
    var portal = root.querySelector('.advent__portal');
    if (!portal) return null;
    var scrim = portal.querySelector('.advent__scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'advent__scrim';

      var card = document.createElement('div');
      card.className = 'advent__card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');

      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'advent__close';
      close.setAttribute('aria-label', 'Fechar');
      close.textContent = '✕';
      /* The stylesheet has no .advent__close rule — keep it usable unstyled. */
      close.style.cssText = 'position:absolute;top:8px;right:8px;z-index:1;' +
        'background:transparent;border:0;font-size:1.5rem;line-height:1;' +
        'cursor:pointer;color:inherit;';

      card.appendChild(close);
      scrim.appendChild(card);
      portal.appendChild(scrim);
    }
    return {
      portal: portal,
      scrim: scrim,
      card: scrim.querySelector('.advent__card'),
      close: scrim.querySelector('.advent__close')
    };
  }

  /* Everything in the card except the close button is per-day content. */
  function clearCard(card, close) {
    Array.prototype.slice.call(card.childNodes).forEach(function (node) {
      if (node !== close) card.removeChild(node);
    });
  }

  function focusables(card) {
    return Array.prototype.slice.call(card.querySelectorAll(FOCUSABLE));
  }

  /* Keep Tab inside the card: past the last focusable wraps to the first,
     shift+Tab past the first wraps to the last. */
  function trapTab(e, card) {
    var items = focusables(card);
    if (!items.length) { e.preventDefault(); return; }
    var first = items[0];
    var last = items[items.length - 1];
    var here = document.activeElement;
    if (e.shiftKey && (here === first || !card.contains(here))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && here === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openOverlay(root, doorEl, day) {
    var shell = ensureShell(root);
    if (!shell) return;
    var tpl = root.querySelector('.advent__tpl[data-day="' + day + '"]');
    if (!tpl) return;

    var st = overlayState(root);
    var previouslyFocused = document.activeElement;
    if (st.open) closeOverlay(root, true);

    st.open = true;
    st.day = day;
    st.returnFocus = previouslyFocused;
    st.shell = shell;

    /* Content ------------------------------------------------------------- */
    clearCard(shell.card, shell.close);
    shell.card.appendChild(tpl.content.cloneNode(true));
    var title = shell.card.querySelector('[data-overlay-title]');
    if (title) {
      if (!title.id) title.id = 'advent-overlay-title-' + (root.dataset.sectionId || '0') + '-' + day;
      shell.card.setAttribute('aria-labelledby', title.id);
    } else {
      shell.card.removeAttribute('aria-labelledby');
    }

    shell.portal.hidden = false;
    document.body.style.overflow = 'hidden';

    /* Scrim fade — CSS only owns `transition: opacity`, JS owns the value. */
    shell.scrim.style.opacity = '0';
    void shell.scrim.offsetWidth;
    shell.scrim.style.opacity = '1';

    /* FLIP: start at the door's box, land on the card's own box. ---------- */
    if (!reduce && typeof shell.card.animate === 'function') {
      var from = doorEl.getBoundingClientRect();
      var to = shell.card.getBoundingClientRect();
      if (to.width > 0 && to.height > 0) {
        var dx = from.left - to.left;
        var dy = from.top - to.top;
        var sx = from.width / to.width;
        var sy = from.height / to.height;
        st.anim = shell.card.animate(
          [
            {
              transformOrigin: 'top left',
              transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')',
              opacity: 0.4
            },
            { transformOrigin: 'top left', transform: 'none', opacity: 1 }
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' }
        );
      }
    }

    /* Focus ---------------------------------------------------------------- */
    shell.close.focus();

    /* Wiring — every listener is torn down again in closeOverlay. --------- */
    st.onClose = function () { closeOverlay(root); };
    shell.close.addEventListener('click', st.onClose);

    st.onEsc = function (e) { if (e.key === 'Escape') { e.preventDefault(); closeOverlay(root); } };
    document.addEventListener('keydown', st.onEsc);

    /* Close on a scrim click only when the press *started* on the scrim, so
       a drag that begins inside the card never dismisses it. */
    st.pressedScrim = false;
    st.onScrimDown = function (e) { st.pressedScrim = e.target === shell.scrim; };
    st.onScrimClick = function (e) {
      if (st.pressedScrim && e.target === shell.scrim) closeOverlay(root);
      st.pressedScrim = false;
    };
    shell.scrim.addEventListener('pointerdown', st.onScrimDown);
    shell.scrim.addEventListener('click', st.onScrimClick);

    st.onTrap = function (e) {
      if (e.key === 'Tab') trapTab(e, shell.card);
    };
    shell.card.addEventListener('keydown', st.onTrap);

    var code = shell.card.querySelector('.advent__code');
    if (code) {
      st.code = code;
      st.onCopy = function () { copyCode(code); };
      code.addEventListener('click', st.onCopy);
    }
  }

  function copyCode(btn) {
    var hint = btn.querySelector('.advent__code-hint');
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    var p;
    try {
      p = navigator.clipboard.writeText(btn.dataset.code || '');
    } catch (err) {
      return; /* blocked by permissions policy — nothing to report */
    }
    if (!p || typeof p.then !== 'function') return;
    p.then(
      function () {
        if (!hint) return;
        hint.textContent = 'copiado';
        clearTimeout(btn._adventCopyTimer);
        btn._adventCopyTimer = setTimeout(function () { hint.textContent = 'copiar'; }, 2000);
      },
      function () { /* denied or unavailable — leave the hint alone */ }
    );
  }

  function closeOverlay(root, immediate) {
    var st = root._adventOverlay;
    if (!st || !st.open) return;
    var shell = st.shell;
    st.open = false;

    /* Unwire everything this open added. */
    document.removeEventListener('keydown', st.onEsc);
    shell.close.removeEventListener('click', st.onClose);
    shell.scrim.removeEventListener('pointerdown', st.onScrimDown);
    shell.scrim.removeEventListener('click', st.onScrimClick);
    shell.card.removeEventListener('keydown', st.onTrap);
    if (st.code && st.onCopy) st.code.removeEventListener('click', st.onCopy);
    st.code = null;
    if (st.anim && typeof st.anim.cancel === 'function') st.anim.cancel();
    st.anim = null;

    document.body.style.overflow = '';

    var done = function (e) {
      /* transitionend bubbles — only the scrim's own opacity fade counts. */
      if (e && (e.target !== shell.scrim || e.propertyName !== 'opacity')) return;
      if (st.open) return; /* re-opened while fading out — leave it alone */
      clearTimeout(st.fallback);
      shell.scrim.removeEventListener('transitionend', done);
      shell.portal.hidden = true;
      clearCard(shell.card, shell.close);
    };

    shell.scrim.style.opacity = '0';
    if (immediate || reduce) {
      done();
    } else {
      shell.scrim.addEventListener('transitionend', done);
      st.fallback = setTimeout(done, 300);
    }

    var back = st.returnFocus;
    st.returnFocus = null;
    if (back && typeof back.focus === 'function' && document.contains(back)) back.focus();
  }

  /* --------------------------------------------------------------- guides -- */

  function trackCount(root, name, fallbackName) {
    var cs = getComputedStyle(root);
    var mobile = window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
    var raw = mobile ? cs.getPropertyValue(fallbackName) : cs.getPropertyValue(name);
    var n = parseInt(String(raw).trim(), 10);
    if (!n || n < 1) n = parseInt(String(cs.getPropertyValue(name)).trim(), 10);
    return n && n > 0 ? n : 0;
  }

  function renderGuides(root, doors) {
    if (root.dataset.guides !== 'true') return;
    var grid = root.querySelector('.advent__grid');
    if (!grid) return;

    var cols = trackCount(root, '--advent-cols', '--advent-cols-m');
    var rows = trackCount(root, '--advent-rows', '--advent-rows-m');
    if (!cols || !rows) return;

    var areas = doors.map(function (d) {
      var cs = getComputedStyle(d);
      /* Some engines don't serialise the shorthand — rebuild from longhands. */
      var area = cs.gridArea ||
        [cs.gridRowStart, cs.gridColumnStart, cs.gridRowEnd, cs.gridColumnEnd].join(' / ');
      return { day: Number(d.dataset.day), area: area };
    });
    var res = H.buildCoverage(areas, cols, rows);

    /* The guide overlay lives inside .advent__grid — that's the positioned
       ancestor its CSS (inset: 0) expects. Rebuild it from scratch. */
    var old = grid.querySelector('.advent__guide');
    if (old) old.parentNode.removeChild(old);

    var guide = document.createElement('div');
    guide.className = 'advent__guide';
    guide.setAttribute('aria-hidden', 'true');

    var cell = function (key, modifier) {
      var parts = String(key).split(',');
      var el = document.createElement('div');
      el.className = 'advent__guide-cell advent__guide-cell--' + modifier;
      el.style.gridArea = parts[0] + ' / ' + parts[1] + ' / span 1 / span 1';
      guide.appendChild(el);
    };

    res.empties.forEach(function (k) { cell(k, 'empty'); });
    res.overlaps.forEach(function (o) { cell(o.cell, 'overlap'); });
    grid.appendChild(guide);

    /* Per-door coordinate labels. */
    doors.forEach(function (door, i) {
      var oldLabel = door.querySelector('.advent__guide-label');
      if (oldLabel) oldLabel.parentNode.removeChild(oldLabel);
      var a = H.parseArea(areas[i].area);
      var label = document.createElement('span');
      label.className = 'advent__guide-label';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = 'd' + areas[i].day + ' · ' +
        a.row + '/' + a.col + '/' + a.rowSpan + '/' + a.colSpan;
      door.appendChild(label);
    });

    var summary = root.querySelector('.advent__guide-summary');
    if (summary) {
      var clean = res.covered === res.total && res.overlaps.length === 0;
      summary.textContent = (clean ? '✅ ' : '⚠️ ') +
        res.covered + '/' + res.total + ' células · ' +
        res.empties.length + ' vazias · ' +
        res.overlaps.length + ' sobreposições';
      summary.hidden = false;
    }
  }

  /* ---------------------------------------------------------------- utils -- */

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var a = arguments;
      var c = this;
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* ------------------------------------------------------------ lifecycle -- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', function (e) {
    var sec = null;
    if (e.target && e.target.querySelector) sec = e.target.querySelector('.advent');
    if (!sec && e.target && e.target.classList && e.target.classList.contains('advent')) sec = e.target;
    if (!sec) return;
    if (sec.dataset.adventReady) {
      renderGuides(sec, Array.prototype.slice.call(sec.querySelectorAll('.advent__door')));
    } else {
      initSection(sec);
    }
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var sec = e.target && e.target.querySelector ? e.target.querySelector('.advent') : null;
    if (!sec && e.target && e.target.classList && e.target.classList.contains('advent')) sec = e.target;
    if (sec && sec._adventCleanup) sec._adventCleanup();
  });
})();
