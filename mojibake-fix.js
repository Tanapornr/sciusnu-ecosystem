(function () {
  function looksBroken(str) {
    return /à¸|à¹|Ã.|Â.|â.|ðŸ|àº|à¥/.test(str);
  }

  function recover(str) {
    if (!str || !looksBroken(str)) return str;
    try {
      return decodeURIComponent(escape(str));
    } catch (_) {
      return str;
    }
  }

  function fixTextNodes(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const v = node.nodeValue;
      const nv = recover(v);
      if (nv !== v) node.nodeValue = nv;
    }
  }

  function fixAttrs(root) {
    const els = (root || document).querySelectorAll('*');
    els.forEach(el => {
      ['placeholder', 'title', 'aria-label', 'value'].forEach(attr => {
        const v = el.getAttribute && el.getAttribute(attr);
        if (!v) return;
        const nv = recover(v);
        if (nv !== v) el.setAttribute(attr, nv);
      });
    });
  }

  function run() {
    try {
      fixTextNodes(document.body);
      fixAttrs(document);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.__fixMojibake = run;
})();
