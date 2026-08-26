/* Kolang RTL — JS shim to fix Monaco's broken click-to-position in RTL mode.
 *
 * PROBLEM: Monaco's hit-testing snaps the caret to line end on mid-line clicks
 * in RTL text. We can't access the editor instance directly (VS Code doesn't
 * expose window.monaco), so we can't call setPosition().
 *
 * STRATEGY: Let Monaco place the cursor (broken), then:
 *   1. Read where Monaco put the caret (via the .cursor element's pixel position)
 *   2. Read where the user actually clicked (saved from the mousedown event)
 *   3. If they differ significantly, synthesize Arrow Left/Right keypresses to
 *      walk the cursor from Monaco's (wrong) position to the clicked position.
 * We compare pixel X positions — if Monaco's caret is to the RIGHT of the click
 * point, we send Arrow Left N times; if to the LEFT, Arrow Right N times.
 *
 * This is hacky but works within Monaco's own input/cursor system. No API
 * access needed.
 *
 * Injected via vscode_custom_css.imports (same loader as rtl.css).
 */
(function () {
  'use strict';

  if (window.__kolangRtlClickFix) return;
  window.__kolangRtlClickFix = true;

  // Track the last mousedown coordinates for .kolang editors
  var lastClick = null;

  function handleMouseDown(e) {
    // Only for .kolang editors
    var editorInstance = e.target.closest('.editor-instance[data-mode-id="kolang"]');
    if (!editorInstance) return;

    // Only left-click, no modifiers (let shift-click selection work normally)
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

    lastClick = { x: e.clientX, y: e.clientY, time: Date.now() };
    // Let Monaco handle the click first, then correct after a tick
    setTimeout(function () { correctCaret(editorInstance, lastClick); }, 0);
  }

  function correctCaret(editorInstance, click) {
    // Abort if the click was too long ago (user may have moved)
    if (Date.now() - click.time > 500) return;

    // Find Monaco's caret element (the blinking cursor)
    var caret = editorInstance.querySelector('.cursor');
    if (!caret) return;

    // Get the caret's pixel position
    var caretRect = caret.getBoundingClientRect();
    var caretX = caretRect.left + caretRect.width / 2;
    var caretY = caretRect.top + caretRect.height / 2;

    // The click Y should be on the same line as the caret (Monaco places on the
    // right line, just wrong column). Compare X.
    var clickX = click.x;
    var dx = caretX - clickX; // positive = caret is RIGHT of click, need Arrow Left

    // If the caret is within a few pixels of the click, Monaco got it right — bail.
    if (Math.abs(dx) < 8) return;

    // We need to walk the caret toward the click point. Estimate how many
    // character widths to move. Average char width in a monospace font is
    // roughly the font size * 0.6, but let's measure from the DOM.
    var viewLine = editorInstance.querySelector('.view-line');
    var charWidth = 8; // fallback
    if (viewLine) {
      // Measure: get the line's rendered text width / text length
      var text = viewLine.textContent || '';
      if (text.length > 0) {
        var lineRect = viewLine.getBoundingClientRect();
        charWidth = lineRect.width / text.length;
        if (charWidth < 4) charWidth = 8; // sanity clamp
      }
    }

    var steps = Math.round(Math.abs(dx) / charWidth);
    if (steps < 1) steps = 1;
    if (steps > 200) steps = 200; // sanity clamp

    // Determine direction:
    // In RTL mode with our arrow-key swap, Arrow Left = visual right, Arrow Right = visual left.
    // But for synthesizing events, we use the RAW Monaco direction (pre-keybinding-swap).
    // The keybindings swap is at the VS Code keybinding layer, not the DOM event layer.
    // So a synthesized 'keydown' ArrowLeft goes to Monaco as ArrowLeft = move left visually.
    //
    // If caret is RIGHT of click (dx > 0), we want to move LEFT visually → Arrow Left
    // If caret is LEFT of click (dx < 0), we want to move RIGHT visually → Arrow Right
    var key = dx > 0 ? 'ArrowLeft' : 'ArrowRight';

    // Synthesize keypresses. We dispatch them on the active element (the editor
    // textarea/input that Monaco uses for input). Find it.
    var textarea = editorInstance.querySelector('textarea.inputarea, .inputarea');
    var target = textarea || document.activeElement;
    if (!target) return;

    // Dispatch the key events. Monaco listens on keydown.
    var dispatched = 0;
    function sendKey() {
      if (dispatched >= steps) return;
      dispatched++;
      var ke = new KeyboardEvent('keydown', {
        key: key,
        code: key === 'ArrowLeft' ? 'ArrowLeft' : 'ArrowRight',
        keyCode: key === 'ArrowLeft' ? 37 : 39,
        which: key === 'ArrowLeft' ? 37 : 39,
        bubbles: true,
        cancelable: true,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false
      });
      target.dispatchEvent(ke);
      // Check if we've arrived (re-read caret position)
      var c = editorInstance.querySelector('.cursor');
      if (c) {
        var r = c.getBoundingClientRect();
        var newDx = (r.left + r.width / 2) - clickX;
        if (Math.abs(newDx) < charWidth) {
          // Close enough — stop
          return;
        }
        // Overshot — reverse direction and halve steps
        if ((newDx > 0) !== (dx > 0)) {
          key = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
          steps = dispatched + Math.ceil((steps - dispatched) / 2);
        }
      }
      // Continue
      if (dispatched < steps) {
        setTimeout(sendKey, 0);
      }
    }
    sendKey();
  }

  // Attach the handler in capture phase so we run BEFORE Monaco's handler.
  function attach() {
    var containers = document.querySelectorAll('.editor-instance[data-mode-id="kolang"] .view-lines');
    containers.forEach(function (c) {
      if (!c.__kolangClickFix) {
        c.__kolangClickFix = true;
        c.addEventListener('mousedown', handleMouseDown, true);
      }
    });
  }

  // Poll for editor creation (Monaco editors are created/destroyed dynamically)
  setInterval(attach, 2000);
  if (window.MutationObserver) {
    new MutationObserver(function () { setTimeout(attach, 50); })
      .observe(document.body, { childList: true, subtree: true });
  }
})();
