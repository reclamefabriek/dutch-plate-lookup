// Kenteken checker — automatische iframe-hoogte.
// Plaats dit script op de pagina ná de <iframe id="kenteken-checker">.
(function () {
  var TYPE = "kenteken-checker:height";

  function resize(event) {
    var data = event.data;
    if (!data || data.type !== TYPE || typeof data.height !== "number") return;

    var iframes = document.querySelectorAll("iframe");
    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      if (iframe.contentWindow === event.source) {
        iframe.style.height = data.height + "px";
      }
    }
  }

  window.addEventListener("message", resize);
})();
