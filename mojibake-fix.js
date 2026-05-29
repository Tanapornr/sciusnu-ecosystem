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

  function run(root) {
    try {
      fixTextNodes(root || document.body);
      fixAttrs(root || document);
      if (document.title) document.title = recover(document.title);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  try {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target) {
          const v = m.target.nodeValue;
          const nv = recover(v);
          if (nv !== v) m.target.nodeValue = nv;
        }
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 3) {
              const v = n.nodeValue;
              const nv = recover(v);
              if (nv !== v) n.nodeValue = nv;
            } else if (n.nodeType === 1) {
              run(n);
            }
          });
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (_) {}

  setTimeout(run, 50);
  setTimeout(run, 300);
  setTimeout(run, 1000);
  setInterval(run, 2500);

  window.__fixMojibake = run;
})();
