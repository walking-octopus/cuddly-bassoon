(function () {
  let css = `
        * {
            font-family: "Ubuntu" !important;
            font-size: 10pt !important;
        }

        ytm-pivot-bar-renderer {
            display: none !important;
        }
    `;

  if (typeof GM_addStyle != "undefined") {
    GM_addStyle(css);
  } else if (typeof PRO_addStyle != "undefined") {
    PRO_addStyle(css);
  } else if (typeof addStyle != "undefined") {
    addStyle(css);
  } else {
    let node = document.createElement("style");
    node.type = "text/css";
    node.appendChild(document.createTextNode(css));

    let heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
      heads[0].appendChild(node);
    } else {
      // No head yet, stick it whereever
      document.documentElement.appendChild(node);
    }
  }
})();
