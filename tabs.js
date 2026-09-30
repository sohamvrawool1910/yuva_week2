/**
 * Accessible Tabs component (vanilla JS, no dependencies).
 *
 * Follows the WAI-ARIA Authoring Practices "Tabs" pattern:
 *  - role=tablist / tab / tabpanel, aria-selected, aria-controls, aria-labelledby
 *  - roving tabindex (only the active tab is in the Tab order)
 *  - Arrow Left/Right (wrapping), Home, End, Enter/Space (manual mode)
 *
 * Usage:
 *   Tabs.initAll();                              // every [data-tabs] element
 *   var t = new Tabs(el, { activation: 'manual' });
 *   t.select(2); t.destroy();
 *
 * Emits a bubbling "tabs:change" CustomEvent on the root: detail = {index, tab, panel}
 */
(function (global) {
  'use strict';

  /** Default options. Can be overridden per instance or with data-tabs-* attributes. */
  var DEFAULTS = {
    activation: 'auto',  // 'auto' = focus shows panel; 'manual' = Enter/Space required
    animate: true,       // play the panel enter animation
    deepLink: true       // sync the active tab with location.hash
  };

  var counter = 0; // used to build unique ids when markup has none

  /** Feature detection: bail out gracefully on browsers that lack the basics. */
  function isSupported() {
    return !!(global.document && document.querySelector && document.addEventListener &&
              document.documentElement.classList && Array.prototype.forEach);
  }

  /** Read options from data attributes, falling back to defaults. */
  function readOptions(root, overrides) {
    var opts = {};
    for (var key in DEFAULTS) { opts[key] = DEFAULTS[key]; }
    var act = root.getAttribute('data-tabs-activation');
    if (act === 'auto' || act === 'manual') { opts.activation = act; }
    if (root.getAttribute('data-tabs-animate') === 'false') { opts.animate = false; }
    if (root.getAttribute('data-tabs-deep-link') === 'false') { opts.deepLink = false; }
    for (var k in (overrides || {})) { opts[k] = overrides[k]; }
    return opts;
  }

  /** Respect the user's reduced-motion preference. */
  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * @param {HTMLElement} root     element containing the tab list and panels
   * @param {Object}      [options]
   */
  function Tabs(root, options) {
    this.root = root;
    this.ready = false;
    if (!isSupported() || !root || root.__tabs) { return; } // unsupported or already initialised

    try {
      this.options = readOptions(root, options);
      this._collect();      // find + validate elements
      this._setupAria();    // add roles / states
      this._createIndicator();
      this._bind();         // events
      this._selectInitial();
      root.__tabs = this;   // prevents double initialisation
      this.ready = true;
    } catch (err) {
      // FALLBACK: leave the original markup untouched so all content stays reachable.
      this._teardownAfterError();
      if (global.console) { console.warn('[Tabs] Initialisation failed:', err.message); }
    }
  }

  /* ---------- setup ---------- */

  /** Gather list, tabs and panels; throw a helpful error if the markup is invalid. */
  Tabs.prototype._collect = function () {
    this.list = this.root.querySelector('[data-tabs-list]');
    if (!this.list) { throw new Error('Missing [data-tabs-list] element.'); }

    this.tabs = [].slice.call(this.list.querySelectorAll('a[href^="#"]'));
    this.panels = [];
    var self = this;

    this.tabs.forEach(function (tab) {
      var id = tab.getAttribute('href').slice(1);
      var panel = document.getElementById(id);
      if (!panel || !self.root.contains(panel)) {
        throw new Error('No panel found for tab link "#' + id + '".');
      }
      self.panels.push(panel);
    });
    if (this.tabs.length === 0) { throw new Error('No tabs found.'); }
  };

  /** Apply ARIA roles and relationships. */
  Tabs.prototype._setupAria = function () {
    var uid = ++counter;
    this.root.classList.add('is-enhanced');
    this.list.setAttribute('role', 'tablist');
    // The <li> wrappers are purely presentational once the tablist role is set.
    [].forEach.call(this.list.children, function (li) { li.setAttribute('role', 'presentation'); });

    var self = this;
    this.tabs.forEach(function (tab, i) {
      var panel = self.panels[i];
      if (!tab.id) { tab.id = 'tab-' + uid + '-' + i; }
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('tabindex', '-1');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.setAttribute('tabindex', '0'); // lets keyboard users reach the panel content
      panel.hidden = true;
    });
  };

  /** Sliding underline element (purely decorative). */
  Tabs.prototype._createIndicator = function () {
    this.indicator = document.createElement('span');
    this.indicator.className = 'tabs__indicator';
    this.indicator.setAttribute('aria-hidden', 'true');
    this.list.appendChild(this.indicator);
  };

  /** Move the indicator under the given tab. */
  Tabs.prototype._positionIndicator = function () {
    var tab = this.tabs[this.selectedIndex];
    if (!tab || !this.indicator) { return; }
    this.indicator.style.setProperty('--indicator-x', tab.offsetLeft + 'px');
    this.indicator.style.setProperty('--indicator-w', tab.offsetWidth + 'px');
  };

  /* ---------- events ---------- */

  Tabs.prototype._bind = function () {
    var self = this;

    // Store bound handlers so destroy() can remove them.
    this._onClick = function (e) {
      var tab = e.target.closest ? e.target.closest('[role="tab"]') : null;
      var i = self.tabs.indexOf(tab);
      if (i < 0) { return; }
      e.preventDefault();               // stop the anchor jump
      self.select(i, { focus: true });
    };

    this._onKeydown = function (e) {
      var i = self.tabs.indexOf(document.activeElement);
      if (i < 0) { return; }
      var last = self.tabs.length - 1, next = null;

      switch (e.key) {
        case 'ArrowRight': case 'Right': next = i === last ? 0 : i + 1; break;
        case 'ArrowLeft':  case 'Left':  next = i === 0 ? last : i - 1; break;
        case 'Home': next = 0; break;
        case 'End':  next = last; break;
        case 'Enter': case ' ': case 'Spacebar':
          e.preventDefault(); self.select(i, { focus: true }); return;
        default: return; // let every other key behave normally
      }
      e.preventDefault();
      if (self.options.activation === 'auto') { self.select(next, { focus: true }); }
      else { self._focusTab(next); } // manual: move focus only
    };

    this._onResize = function () { self._positionIndicator(); };
    this._onHash = function () {
      if (!self.options.deepLink) { return; }
      var i = self._indexFromHash();
      if (i > -1 && i !== self.selectedIndex) { self.select(i, { updateHash: false }); }
    };

    this.list.addEventListener('click', this._onClick);
    this.list.addEventListener('keydown', this._onKeydown);
    global.addEventListener('resize', this._onResize);
    global.addEventListener('hashchange', this._onHash);
    // Fonts loading can change tab widths, so re-measure once everything is ready.
    global.addEventListener('load', this._onResize);
  };

  /* ---------- behaviour ---------- */

  Tabs.prototype._indexFromHash = function () {
    var hash = global.location && global.location.hash.slice(1);
    for (var i = 0; i < this.panels.length; i++) {
      if (this.panels[i].id === hash) { return i; }
    }
    return -1;
  };

  Tabs.prototype._selectInitial = function () {
    var i = this.options.deepLink ? this._indexFromHash() : -1;
    this.select(i > -1 ? i : 0, { updateHash: false, silent: true });
  };

  Tabs.prototype._focusTab = function (i) {
    this.tabs.forEach(function (t, n) { t.setAttribute('tabindex', n === i ? '0' : '-1'); });
    this.tabs[i].focus();
  };

  /**
   * Activate a tab by index.
   * @param {number} index
   * @param {{focus?:boolean, updateHash?:boolean, silent?:boolean}} [opts]
   */
  Tabs.prototype.select = function (index, opts) {
    opts = opts || {};
    if (!this.tabs || index < 0 || index >= this.tabs.length) { return; }
    var self = this;

    this.tabs.forEach(function (tab, i) {
      var active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      var panel = self.panels[i];
      if (active) {
        var wasHidden = panel.hidden;
        panel.hidden = false;
        if (wasHidden && self.options.animate && !prefersReducedMotion()) { self._animate(panel); }
      } else {
        panel.hidden = true;
        panel.classList.remove('is-entering');
      }
    });

    var changed = this.selectedIndex !== index;
    this.selectedIndex = index;
    this._positionIndicator();
    if (opts.focus) { this.tabs[index].focus(); }

    // Keep the URL shareable without adding history entries or scrolling the page.
    if (changed && this.options.deepLink && opts.updateHash !== false && global.history && history.replaceState) {
      try { history.replaceState(null, '', '#' + this.panels[index].id); } catch (e) { /* file:// or sandbox */ }
    }
    if (changed && !opts.silent) { this._emit(index); }
  };

  /** Add the enter-animation class and clean it up when finished. */
  Tabs.prototype._animate = function (panel) {
    panel.classList.remove('is-entering');
    void panel.offsetWidth;                 // force reflow so the animation can restart
    panel.classList.add('is-entering');
    panel.addEventListener('animationend', function done() {
      panel.classList.remove('is-entering');
      panel.removeEventListener('animationend', done);
    });
  };

  /** Fire "tabs:change" (uses a legacy fallback for very old browsers). */
  Tabs.prototype._emit = function (index) {
    var detail = { index: index, tab: this.tabs[index], panel: this.panels[index] };
    var evt;
    if (typeof global.CustomEvent === 'function') {
      evt = new CustomEvent('tabs:change', { bubbles: true, detail: detail });
    } else {
      evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('tabs:change', true, false, detail);
    }
    this.root.dispatchEvent(evt);
  };

  /* ---------- cleanup ---------- */

  /** Remove listeners and ARIA additions, restoring the original markup. */
  Tabs.prototype.destroy = function () {
    if (!this.ready) { return; }
    this.list.removeEventListener('click', this._onClick);
    this.list.removeEventListener('keydown', this._onKeydown);
    global.removeEventListener('resize', this._onResize);
    global.removeEventListener('hashchange', this._onHash);
    global.removeEventListener('load', this._onResize);
    this._teardownAfterError();
    delete this.root.__tabs;
    this.ready = false;
  };

  /** Shared by destroy() and the error path: undo DOM changes. */
  Tabs.prototype._teardownAfterError = function () {
    if (!this.root) { return; }
    this.root.classList.remove('is-enhanced');
    if (this.indicator && this.indicator.parentNode) { this.indicator.parentNode.removeChild(this.indicator); }
    if (this.list) {
      this.list.removeAttribute('role');
      [].forEach.call(this.list.children, function (li) { li.removeAttribute('role'); });
    }
    (this.tabs || []).forEach(function (t) {
      ['role', 'aria-controls', 'aria-selected', 'tabindex'].forEach(function (a) { t.removeAttribute(a); });
    });
    (this.panels || []).forEach(function (p) {
      ['role', 'aria-labelledby', 'tabindex'].forEach(function (a) { p.removeAttribute(a); });
      p.hidden = false; // everything visible again
    });
  };

  /** Initialise every [data-tabs] element inside `scope` (default: document). */
  Tabs.initAll = function (scope) {
    if (!isSupported()) { return []; }
    return [].map.call((scope || document).querySelectorAll('[data-tabs]'), function (el) {
      return new Tabs(el);
    });
  };

  global.Tabs = Tabs;
})(window);
