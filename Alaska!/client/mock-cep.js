(function (global) {
  "use strict";

  function mockResponse(script) {
    var code = String(script || '').replace(/^\s+|\s+$/g, '');
    var match;

    if (code === 'alaskaPing()') return 'MOCK: CEP bridge OK — After Effects tidak sedang dijalankan.';
    match = /^alaskaAlign\("([^\"]+)"\)$/.exec(code);
    if (match) return 'MOCK: Align ' + match[1] + ' berhasil pada 2 layer contoh.';
    match = /^alaskaAutoPrecomp\("([^\"]*)",\s*(true|false)\)$/.exec(code);
    if (match) return 'MOCK: Precomp "' + (match[1] || 'Precomp') + '" siap (simulasi).';
    match = /^alaskaApplyGraph\("([^\"]+)",\s*([0-9.]+)\)$/.exec(code);
    if (match) return 'MOCK: Graph ' + match[1] + ' diterapkan ke 4 keyframe contoh.';
    match = /^alaskaApplyCustomGraph\(([0-9.]+),\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)\)$/.exec(code);
    if (match) return 'MOCK: Manual graph in ' + match[2] + '% / out ' + match[4] + '% diterapkan (simulasi).';
    match = /^alaskaAddColorBackground\("([^\"]+)",\s*"([^\"]*)"\)$/.exec(code);
    if (match) return 'MOCK: Solid ' + match[1] + ' / "' + match[2] + '" dibuat (simulasi).';
    if (code === 'alaskaCutAtPlayhead()') return 'MOCK: 2 layer contoh dipotong di playhead.';
    match = /^alaskaSetSelected3D\((true|false)\)$/.exec(code);
    if (match) return 'MOCK: 2 layer contoh ' + (match[1] === 'true' ? 'diaktifkan sebagai 3D' : 'diubah ke 2D') + '.';
    match = /^alaskaCreateTrueComp\(([0-9]+)\)$/.exec(code);
    if (match) return 'MOCK: ' + match[1] + ' True Comp dibuat untuk setiap layer comp terpilih. Comp sumber tetap tidak berubah.';
    match = /^alaskaRenameSelectedLayers\("([^\"]*)"\)$/.exec(code);
    if (match) return 'MOCK: 2 layer contoh di-rename dengan prefix ' + match[1] + '.';
    match = /^alaskaStaggerSelectedLayers\(([0-9.]+)\)$/.exec(code);
    if (match) return 'MOCK: 3 layer contoh di-stagger tiap ' + match[1] + ' frame.';
    match = /^alaskaSetSelectedTransform\("(position|scale|opacity|rotation)",\s*(-?[0-9.]+),\s*(-?[0-9.]+|undefined),\s*(-?[0-9.]+|undefined)\)$/.exec(code);
    if (match) return 'MOCK: ' + match[1] + ' diterapkan pada layer contoh.';
    match = /^alaskaCreateBeatGrid\(([0-9.]+)\)$/.exec(code);
    if (match) return 'MOCK: Beat grid ' + match[1] + ' BPM dibuat (simulasi).';
    return 'MOCK: Perintah diterima, tetapi belum ada simulasi untuk perintah ini.';
  }

  global.__alaskaMock = true;
  global.__alaskaMockCommands = [];
  global.__adobe_cep__ = {
    evalScript: function (script, callback) {
      var code = String(script || '');
      global.__alaskaMockCommands.push(code);
      global.setTimeout(function () {
        if (typeof callback === 'function') callback(mockResponse(code));
      }, 120);
    }
  };
})(window);
