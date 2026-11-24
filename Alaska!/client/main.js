var csInterface = new CSInterface();

function setStatus(msg) {
  var el = document.getElementById('status');
  if (el) el.innerText = 'Status: ' + msg;
}

function escapeJsxStr(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function logActivity(label, result) {
  var el = document.getElementById('activityLog');
  if (!el) return;
  var line = new Date().toLocaleTimeString() + ' — ' + label + ': ' + result;
  var previous = el.innerText === 'Belum ada aksi.' ? '' : el.innerText;
  var entries = [line].concat(previous ? previous.split('\n') : []);
  el.innerText = entries.slice(0, 5).join('\n');
}

var pendingConfirmAction = null;

function showConfirmDialog(label, callback) {
  var modal = document.getElementById('actionConfirmModal');
  var message = document.getElementById('confirmMessage');
  if (!modal || !message) { callback(false); return; }
  pendingConfirmAction = callback;
  message.textContent = label || 'Jalankan aksi Alaska AI ini?';
  modal.className = 'modal-overlay open';
  document.getElementById('btnConfirmAction').focus();
}

function closeConfirmDialog(approved) {
  var modal = document.getElementById('actionConfirmModal');
  if (modal) modal.className = 'modal-overlay';
  var callback = pendingConfirmAction;
  pendingConfirmAction = null;
  if (callback) callback(Boolean(approved));
}

function runJsx(code, label, requiresApproval, onComplete) {
  var approvalMode = document.getElementById('approvalMode');
  if (requiresApproval && approvalMode && approvalMode.checked) {
    showConfirmDialog(label, function (approved) {
      if (!approved) {
        setStatus('Aksi Alaska AI dibatalkan.');
        logActivity(label || 'Aksi AI', 'dibatalkan');
        if (onComplete) onComplete(false);
        return;
      }
      runJsx(code, label, false, onComplete);
    });
    return true;
  }
  setStatus('Mengirim ke AE...');
  try {
    csInterface.evalScript(code, function (res) {
      if (res === undefined || res === null || res === '' || res === 'undefined') {
        setStatus('Respon kosong/undefined dari AE (cek apakah fungsi JSX terbaca).');
        logActivity(label || 'Aksi', 'respon kosong');
        if (onComplete) onComplete(false);
        return;
      }
      setStatus(res);
      logActivity(label || 'Aksi', res);
      if (onComplete) onComplete(true);
    });
  } catch (err) {
    setStatus('JS Error: ' + err.message);
    logActivity(label || 'Aksi', 'JS Error: ' + err.message);
    if (onComplete) onComplete(false);
    return false;
  }
  return true;
}

window.addEventListener('DOMContentLoaded', function () {
  if (window.__alaskaMock) {
    var devBadge = document.getElementById('devBadge');
    if (devBadge) devBadge.style.display = 'inline-block';
    setStatus('Preview MOCK aktif. Tidak ada perubahan pada project After Effects.');
  }

  document.getElementById('btnCancelAction').addEventListener('click', function () { closeConfirmDialog(false); });
  document.getElementById('btnConfirmAction').addEventListener('click', function () { closeConfirmDialog(true); });
  document.getElementById('actionConfirmModal').addEventListener('click', function (event) {
    if (event.target === this) closeConfirmDialog(false);
  });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && pendingConfirmAction) closeConfirmDialog(false);
  });

  var navButtons = document.querySelectorAll('.nav-button[data-panel]');
  for (var n = 0; n < navButtons.length; n++) {
    navButtons[n].addEventListener('click', function () {
      var targetId = this.getAttribute('data-panel');
      var navItems = document.querySelectorAll('.nav-button[data-panel]');
      for (var navIndex = 0; navIndex < navItems.length; navIndex++) {
        navItems[navIndex].className = navItems[navIndex] === this ? 'nav-button active' : 'nav-button';
      }

      var panels = document.querySelectorAll('.feature-panel');
      for (var panelIndex = 0; panelIndex < panels.length; panelIndex++) {
        panels[panelIndex].className = panels[panelIndex].id === targetId
          ? 'feature-panel active'
          : 'feature-panel';
      }
    });
  }

  var themeImage = document.getElementById('themeImage');
  var themeVideo = document.getElementById('themeVideo');
  var themeOverlay = document.getElementById('themeOverlay');
  var themeFile = document.getElementById('themeFile');
  var themeDimmer = document.getElementById('themeDimmer');
  var panelOpacity = document.getElementById('panelOpacity');
  var textOpacity = document.getElementById('textOpacity');
  var customThemeColor = document.getElementById('customThemeColor');

  function applyAccentColor(hexColor, persist) {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(hexColor || ''));
    if (!match) return;
    var hex = '#' + match[1].toLowerCase();
    var red = parseInt(match[1].substring(0, 2), 16);
    var green = parseInt(match[1].substring(2, 4), 16);
    var blue = parseInt(match[1].substring(4, 6), 16);
    function linearize(channel) {
      channel = channel / 255;
      return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    }
    var luminance = 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', red + ',' + green + ',' + blue);
    document.documentElement.style.setProperty('--accent-foreground', luminance > 0.179 ? '#17191c' : '#ffffff');
    customThemeColor.value = hex;
    var themeTrigger = document.getElementById('themeColorTrigger');
    if (themeTrigger) themeTrigger.style.setProperty('--swatch-color', hex);
    var themeButtons = document.querySelectorAll('.theme-chip');
    for (var i = 0; i < themeButtons.length; i++) {
      themeButtons[i].className = themeButtons[i].getAttribute('data-theme-color').toLowerCase() === hex
        ? 'theme-chip selected' : 'theme-chip';
    }
    var templatePaths = document.querySelectorAll('.graph-template svg path');
    for (var p = 0; p < templatePaths.length; p++) templatePaths[p].setAttribute('stroke', hex);
    if (persist) {
      try { localStorage.setItem('alaskaAccentColor', hex); } catch (ignore) {}
    }
  }

  var colorPickerModal = document.getElementById('colorPickerModal');
  var colorPlane = document.getElementById('colorPlane');
  var colorPlaneCursor = document.getElementById('colorPlaneCursor');
  var colorHue = document.getElementById('colorHue');
  var colorPickerHex = document.getElementById('colorPickerHex');
  var colorPreview = document.getElementById('colorPreview');
  var applyColorPickerButton = document.getElementById('btnApplyColorPicker');
  var pickerTarget = null;
  var pickerHsv = { h: 210, s: 0.8, v: 0.91 };

  function hexToHsv(hex) {
    var red = parseInt(hex.substring(1, 3), 16) / 255;
    var green = parseInt(hex.substring(3, 5), 16) / 255;
    var blue = parseInt(hex.substring(5, 7), 16) / 255;
    var max = Math.max(red, green, blue);
    var min = Math.min(red, green, blue);
    var delta = max - min;
    var hue = 0;
    if (delta) {
      if (max === red) hue = ((green - blue) / delta) % 6;
      else if (max === green) hue = (blue - red) / delta + 2;
      else hue = (red - green) / delta + 4;
      hue = (hue * 60 + 360) % 360;
    }
    return { h: hue, s: max ? delta / max : 0, v: max };
  }

  function hsvToHex(h, s, v) {
    var chroma = v * s;
    var segment = h / 60;
    var x = chroma * (1 - Math.abs(segment % 2 - 1));
    var rgb = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0] :
      segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma] :
      segment < 5 ? [x, 0, chroma] : [chroma, 0, x];
    var match = v - chroma;
    function toHex(value) { return Math.round((value + match) * 255).toString(16).padStart(2, '0'); }
    return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
  }

  function renderColorPicker(syncHex) {
    var hex = hsvToHex(pickerHsv.h, pickerHsv.s, pickerHsv.v);
    colorPlane.style.backgroundColor = 'hsl(' + pickerHsv.h + ', 100%, 50%)';
    colorPlaneCursor.style.left = (pickerHsv.s * 100) + '%';
    colorPlaneCursor.style.top = ((1 - pickerHsv.v) * 100) + '%';
    colorHue.value = String(Math.round(pickerHsv.h));
    colorPreview.style.backgroundColor = hex;
    if (syncHex) colorPickerHex.value = hex;
    applyColorPickerButton.disabled = !/^#[0-9a-f]{6}$/i.test(colorPickerHex.value);
    colorPlane.setAttribute('aria-valuenow', String(Math.round(pickerHsv.s * 100)));
  }

  function closeColorPicker() {
    colorPickerModal.className = 'color-picker-overlay';
    colorPickerModal.setAttribute('aria-hidden', 'true');
    pickerTarget = null;
  }

  function openColorPicker(target, initialColor) {
    pickerTarget = target;
    var validColor = /^#[0-9a-f]{6}$/i.test(initialColor) ? initialColor : '#2585e8';
    pickerHsv = hexToHsv(validColor);
    document.getElementById('colorPickerTitle').textContent = target === 'theme' ? 'Warna Tema' : 'Warna Palette';
    colorPickerModal.className = 'color-picker-overlay open';
    colorPickerModal.setAttribute('aria-hidden', 'false');
    renderColorPicker(true);
    applyColorPickerButton.focus();
  }

  document.getElementById('paletteColorTrigger').addEventListener('click', function () {
    openColorPicker('palette', paletteColorInput ? paletteColorInput.value : '#ffffff');
  });
  document.getElementById('themeColorTrigger').addEventListener('click', function () {
    openColorPicker('theme', customThemeColor.value);
  });
  document.getElementById('btnCloseColorPicker').addEventListener('click', closeColorPicker);
  document.getElementById('btnCancelColorPicker').addEventListener('click', closeColorPicker);
  colorPickerModal.addEventListener('click', function (event) {
    if (event.target === colorPickerModal) closeColorPicker();
  });
  colorHue.addEventListener('input', function () {
    pickerHsv.h = Number(this.value);
    renderColorPicker(true);
  });
  colorPickerHex.addEventListener('input', function () {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(this.value || '').trim());
    if (!match) { applyColorPickerButton.disabled = true; return; }
    pickerHsv = hexToHsv('#' + match[1]);
    renderColorPicker(false);
    applyColorPickerButton.disabled = false;
  });

  function setColorPlaneFromEvent(event) {
    var bounds = colorPlane.getBoundingClientRect();
    pickerHsv.s = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pickerHsv.v = 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    renderColorPicker(true);
  }
  colorPlane.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    if (colorPlane.setPointerCapture) colorPlane.setPointerCapture(event.pointerId);
    setColorPlaneFromEvent(event);
  });
  colorPlane.addEventListener('pointermove', function (event) {
    if (event.buttons) setColorPlaneFromEvent(event);
  });
  colorPlane.addEventListener('keydown', function (event) {
    var step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === 'ArrowLeft') pickerHsv.s = Math.max(0, pickerHsv.s - step);
    else if (event.key === 'ArrowRight') pickerHsv.s = Math.min(1, pickerHsv.s + step);
    else if (event.key === 'ArrowUp') pickerHsv.v = Math.min(1, pickerHsv.v + step);
    else if (event.key === 'ArrowDown') pickerHsv.v = Math.max(0, pickerHsv.v - step);
    else return;
    event.preventDefault();
    renderColorPicker(true);
  });
  applyColorPickerButton.addEventListener('click', function () {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(colorPickerHex.value || '').trim());
    if (!match || !pickerTarget) return;
    var color = '#' + match[1].toLowerCase();
    if (pickerTarget === 'theme') {
      applyAccentColor(color, true);
      setStatus('Warna tema diterapkan.');
    } else {
      if (selectedPaletteIndex >= 0 && selectedPaletteIndex < paletteColors.length) {
        paletteColors[selectedPaletteIndex] = color;
        arrangePaletteColors();
        selectedPaletteIndex = paletteColors.indexOf(color);
        savePaletteData();
        syncPaletteInputs(color);
        rememberPaletteColor(color);
        renderPalette();
        setStatus('Warna swatch diperbarui.');
        logActivity('Color palette', color + ' updated');
      } else {
        addPaletteColor(color);
      }
    }
    closeColorPicker();
  });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && pickerTarget) closeColorPicker();
  });

  function applyAppearance() {
    var panelValue = Number(panelOpacity.value) || 78;
    var textValue = Number(textOpacity.value) || 100;
    document.documentElement.style.setProperty('--panel-opacity', String(panelValue / 100));
    document.documentElement.style.setProperty('--text-opacity', String(textValue / 100));
    document.getElementById('panelOpacityValue').innerText = panelValue + '%';
    document.getElementById('textOpacityValue').innerText = textValue + '%';
    try {
      localStorage.setItem('alaskaPanelOpacity', String(panelValue));
      localStorage.setItem('alaskaTextOpacity', String(textValue));
    } catch (ignore) {}
  }

  function applyDimmer(value) {
    var amount = Math.max(0, Math.min(90, Number(value) || 0));
    themeOverlay.style.opacity = String(amount / 100);
    document.getElementById('themeDimmerValue').innerText = amount + '%';
    try { localStorage.setItem('alaskaThemeDimmer', String(amount)); } catch (ignore) {}
  }

  function clearVideoSource() {
    if (themeVideo.src && themeVideo.src.indexOf('blob:') === 0) {
      URL.revokeObjectURL(themeVideo.src);
    }
    themeVideo.pause();
    themeVideo.removeAttribute('src');
    themeVideo.load();
    themeVideo.style.display = 'none';
  }

  function showThemeImage(dataUrl, persist) {
    clearVideoSource();
    themeImage.src = dataUrl;
    themeImage.style.display = 'block';
    if (persist) {
      try { localStorage.setItem('alaskaThemeImage', dataUrl); } catch (ignore) {}
    }
  }

  try {
    var savedDimmer = localStorage.getItem('alaskaThemeDimmer');
    if (savedDimmer !== null) themeDimmer.value = savedDimmer;
    var savedPanelOpacity = localStorage.getItem('alaskaPanelOpacity');
    var savedTextOpacity = localStorage.getItem('alaskaTextOpacity');
    if (savedPanelOpacity !== null) panelOpacity.value = savedPanelOpacity;
    if (savedTextOpacity !== null) textOpacity.value = savedTextOpacity;
    var savedImage = localStorage.getItem('alaskaThemeImage');
    if (savedImage) showThemeImage(savedImage, false);
    var savedAccent = localStorage.getItem('alaskaAccentColor');
    if (savedAccent) applyAccentColor(savedAccent, false);
  } catch (ignore) {}

  var themeButtons = document.querySelectorAll('.theme-chip[data-theme-color]');
  for (var themeIndex = 0; themeIndex < themeButtons.length; themeIndex++) {
    themeButtons[themeIndex].addEventListener('click', function () {
      applyAccentColor(this.getAttribute('data-theme-color'), true);
      setStatus('Theme color updated.');
    });
  }
  customThemeColor.addEventListener('input', function () { applyAccentColor(this.value, true); });

  applyDimmer(themeDimmer.value);
  applyAppearance();

  themeDimmer.addEventListener('input', function () {
    applyDimmer(this.value);
  });
  panelOpacity.addEventListener('input', applyAppearance);
  textOpacity.addEventListener('input', applyAppearance);
  document.getElementById('btnResetAppearance').addEventListener('click', function () {
    panelOpacity.value = 78;
    textOpacity.value = 100;
    themeDimmer.value = 58;
    applyAccentColor('#2585e8', true);
    applyAppearance();
    applyDimmer(58);
    setStatus('Appearance returned to defaults.');
  });

  themeFile.addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;

    if (file.type.indexOf('image/') === 0) {
      var reader = new FileReader();
      reader.onload = function () {
        themeVideo.style.display = 'none';
        var canPersist = file.size <= 2 * 1024 * 1024;
        showThemeImage(reader.result, canPersist);
        if (!canPersist) {
          try { localStorage.removeItem('alaskaThemeImage'); } catch (ignore) {}
        }
        setStatus(file.size <= 2 * 1024 * 1024
          ? 'Gambar tema diterapkan dan disimpan.'
          : 'Gambar tema diterapkan untuk sesi ini; file di atas 2 MB tidak disimpan permanen.');
        logActivity('Tema panel', 'gambar diterapkan');
      };
      reader.onerror = function () { setStatus('Gagal membaca file gambar.'); };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type === 'video/mp4' || /\.mp4$/i.test(file.name)) {
      try {
        themeImage.removeAttribute('src');
        themeImage.style.display = 'none';
        clearVideoSource();
        themeVideo.src = URL.createObjectURL(file);
        themeVideo.style.display = 'block';
        themeVideo.play();
        try { localStorage.removeItem('alaskaThemeImage'); } catch (ignore) {}
        setStatus('Video MP4 menjadi background panel dan diputar looping.');
        logActivity('Tema panel', 'video MP4 diterapkan');
      } catch (err) {
        setStatus('Gagal memutar video: ' + err.message);
      }
      return;
    }

    setStatus('Pilih file gambar atau video MP4.');
  });

  document.getElementById('btnClearTheme').addEventListener('click', function () {
    clearVideoSource();
    themeImage.removeAttribute('src');
    themeImage.style.display = 'none';
    try { localStorage.removeItem('alaskaThemeImage'); } catch (ignore) {}
    setStatus('Tema background panel direset.');
    logActivity('Tema panel', 'direset');
  });

  var paletteContainer = document.getElementById('paletteSwatches');
  var paletteColorInput = document.getElementById('backgroundColor');
  var paletteHexInput = document.getElementById('paletteHexInput');
  var deletePaletteButton = document.getElementById('btnDeletePaletteColor');
  var paletteColors = ['#ffffff', '#d6c44f', '#ff9f0a', '#34c759', '#32ade6'];
  var paletteHistory = [];
  var paletteCount = 5;
  var savedPalettes = [];
  var selectedPaletteIndex = -1;
  try {
    var savedPalette = JSON.parse(localStorage.getItem('alaskaCustomPalette') || 'null');
    if (Object.prototype.toString.call(savedPalette) === '[object Array]') {
      var cleanPalette = savedPalette.filter(function (color) { return /^#[0-9a-f]{6}$/i.test(color); }).slice(0, 7).map(function (color) { return color.toLowerCase(); });
      if (cleanPalette.length) paletteColors = cleanPalette;
    }
    var savedPaletteHistory = JSON.parse(localStorage.getItem('alaskaPaletteHistory') || '[]');
    if (Object.prototype.toString.call(savedPaletteHistory) === '[object Array]') {
      paletteHistory = savedPaletteHistory.filter(function (color) { return /^#[0-9a-f]{6}$/i.test(color); }).slice(0, 12).map(function (color) { return color.toLowerCase(); });
    }
    var storedPalettes = JSON.parse(localStorage.getItem('alaskaSavedPalettes') || '[]');
    if (Object.prototype.toString.call(storedPalettes) === '[object Array]') {
      savedPalettes = storedPalettes.filter(function (entry) {
        return entry && typeof entry.name === 'string' && Object.prototype.toString.call(entry.colors) === '[object Array]';
      }).map(function (entry) {
        return { name: entry.name, colors: entry.colors.filter(function (color) { return /^#[0-9a-f]{6}$/i.test(color); }).slice(0, 7).map(function (color) { return color.toLowerCase(); }) };
      }).filter(function (entry) { return entry.colors.length > 0; }).slice(0, 20);
    }
    paletteCount = Number(localStorage.getItem('alaskaPaletteCount')) || 5;
  } catch (ignore) {}
  if ([4, 5, 6, 7].indexOf(paletteCount) < 0) paletteCount = 5;

  function getPaletteHex() {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(paletteHexInput.value || '').replace(/^\s+|\s+$/g, ''));
    return match ? '#' + match[1].toLowerCase() : null;
  }

  function syncPaletteInputs(color) {
    paletteColorInput.value = color;
    paletteHexInput.value = color;
    document.getElementById('paletteColorTrigger').style.setProperty('--swatch-color', color);
  }

  function selectPaletteColor(color, index) {
    selectedPaletteIndex = typeof index === 'number' && index >= 0 ? index : paletteColors.indexOf(color);
    if (selectedPaletteIndex < 0) selectedPaletteIndex = -1;
    if (selectedPaletteIndex >= paletteCount) selectedPaletteIndex = -1;
    syncPaletteInputs(color);
    deletePaletteButton.disabled = selectedPaletteIndex < 0;
    renderPalette();
  }

  function savePaletteData() {
    try {
      localStorage.setItem('alaskaCustomPalette', JSON.stringify(paletteColors.slice(0, 7)));
      localStorage.setItem('alaskaPaletteCount', String(paletteCount));
    } catch (ignore) {}
  }

  function getPaletteHsl(hex) {
    var red = parseInt(hex.substring(1, 3), 16) / 255;
    var green = parseInt(hex.substring(3, 5), 16) / 255;
    var blue = parseInt(hex.substring(5, 7), 16) / 255;
    var max = Math.max(red, green, blue);
    var min = Math.min(red, green, blue);
    var delta = max - min;
    var hue = 0;
    var saturation = max === 0 ? 0 : delta / max;
    if (delta) {
      if (max === red) hue = ((green - blue) / delta) % 6;
      else if (max === green) hue = (blue - red) / delta + 2;
      else hue = (red - green) / delta + 4;
      hue = (hue * 60 + 360) % 360;
    }
    return { hue: hue, saturation: saturation, lightness: (max + min) / 2 };
  }

  function arrangePaletteColors() {
    paletteColors.sort(function (a, b) {
      var first = getPaletteHsl(a);
      var second = getPaletteHsl(b);
      var firstNeutral = first.saturation < 0.06;
      var secondNeutral = second.saturation < 0.06;
      if (firstNeutral !== secondNeutral) return firstNeutral ? -1 : 1;
      if (firstNeutral) return second.lightness - first.lightness;
      if (Math.abs(first.hue - second.hue) > 0.1) return first.hue - second.hue;
      return first.saturation - second.saturation;
    });
  }

  function savePalettesData() {
    try { localStorage.setItem('alaskaSavedPalettes', JSON.stringify(savedPalettes)); } catch (ignore) {}
  }

  function rememberPaletteColor(color) {
    paletteHistory = [color].concat(paletteHistory.filter(function (entry) { return entry !== color; })).slice(0, 12);
    try { localStorage.setItem('alaskaPaletteHistory', JSON.stringify(paletteHistory)); } catch (ignore) {}
    renderPaletteHistory();
  }

  function renderPaletteHistory() {
    var historyContainer = document.getElementById('paletteHistory');
    historyContainer.innerHTML = '';
    for (var h = 0; h < paletteHistory.length; h++) {
      (function (color) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'palette-swatch';
        chip.style.backgroundColor = color;
        chip.title = color;
        chip.setAttribute('aria-label', 'Use recent color ' + color);
        chip.addEventListener('click', function () {
          selectPaletteColor(color, paletteColors.indexOf(color));
          setStatus('Color ' + color + ' dipilih.');
        });
        historyContainer.appendChild(chip);
      })(paletteHistory[h]);
    }
    if (!paletteHistory.length) historyContainer.innerHTML = '<span class="hint">Belum ada warna.</span>';
  }

  function renderSavedPalettes() {
    var container = document.getElementById('savedPalettes');
    container.innerHTML = '';
    if (!savedPalettes.length) {
      container.innerHTML = '<span class="palette-empty">Belum ada palette tersimpan.</span>';
      return;
    }
    for (var p = 0; p < savedPalettes.length; p++) {
      (function (entry, paletteIndex) {
        var card = document.createElement('div');
        card.className = 'saved-palette';
        var head = document.createElement('div');
        head.className = 'saved-palette-head';
        var title = document.createElement('span');
        title.className = 'saved-palette-name';
        title.textContent = entry.name;
        head.appendChild(title);
        var colors = document.createElement('div');
        colors.className = 'saved-palette-colors';
        for (var c = 0; c < entry.colors.length; c++) {
          var colorChip = document.createElement('span');
          colorChip.className = 'saved-palette-color';
          colorChip.style.backgroundColor = entry.colors[c];
          colorChip.title = entry.colors[c];
          colors.appendChild(colorChip);
        }
        var actions = document.createElement('div');
        actions.className = 'saved-palette-actions';
        var load = document.createElement('button');
        load.type = 'button'; load.textContent = 'Load';
        load.addEventListener('click', function () {
          paletteColors = entry.colors.slice(0, 7);
          paletteCount = Math.max(4, Math.min(7, Math.max(Number(entry.count) || 4, paletteColors.length)));
          selectedPaletteIndex = -1;
          if (paletteColors.length) syncPaletteInputs(paletteColors[0]);
          deletePaletteButton.disabled = true;
          savePaletteData();
          renderPalette();
          setStatus('Palette "' + entry.name + '" dimuat.');
        });
        var remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = 'Delete';
        remove.addEventListener('click', function () {
          savedPalettes.splice(paletteIndex, 1);
          savePalettesData();
          renderSavedPalettes();
          setStatus('Palette "' + entry.name + '" dihapus.');
        });
        actions.appendChild(load); actions.appendChild(remove);
        card.appendChild(head); card.appendChild(colors); card.appendChild(actions);
        container.appendChild(card);
      })(savedPalettes[p], p);
    }
  }

  function renderPalette() {
    paletteContainer.innerHTML = '';
    paletteContainer.style.setProperty('--palette-columns', String(paletteCount));
    for (var i = 0; i < paletteCount; i++) {
      (function (paletteIndex) {
        var color = paletteColors[paletteIndex];
        var swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = color ? 'palette-swatch' : 'palette-swatch empty';
        if (color) {
          swatch.style.backgroundColor = color;
          swatch.title = color + ' · Geser untuk mengatur urutan';
          swatch.setAttribute('aria-label', 'Edit color ' + color);
          if (selectedPaletteIndex === paletteIndex) swatch.className += ' selected';
        } else {
          swatch.title = 'Add a color';
          swatch.setAttribute('aria-label', 'Add color to empty slot');
        }
        swatch.addEventListener('click', function () {
          if (color) selectPaletteColor(color, paletteIndex);
          else {
            selectedPaletteIndex = -1;
            deletePaletteButton.disabled = true;
            renderPalette();
            openColorPicker('palette', getPaletteHex() || '#ffffff');
          }
        });
        if (color) {
          swatch.draggable = true;
          swatch.addEventListener('dragstart', function (event) {
            event.dataTransfer.setData('text/plain', String(paletteIndex));
            event.dataTransfer.effectAllowed = 'move';
            swatch.className += ' dragging';
          });
          swatch.addEventListener('dragend', function () {
            swatch.className = swatch.className.replace(/\s*dragging/g, '');
          });
          swatch.addEventListener('dragover', function (event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          });
          swatch.addEventListener('drop', function (event) {
            event.preventDefault();
            var fromIndex = Number(event.dataTransfer.getData('text/plain'));
            if (isNaN(fromIndex) || fromIndex === paletteIndex || fromIndex < 0 || fromIndex >= paletteColors.length) return;
            var movedColor = paletteColors.splice(fromIndex, 1)[0];
            paletteColors.splice(paletteIndex, 0, movedColor);
            selectedPaletteIndex = paletteIndex;
            syncPaletteInputs(movedColor);
            savePaletteData();
            renderPalette();
            setStatus('Urutan palette diperbarui.');
          });
        }
        paletteContainer.appendChild(swatch);
      })(i);
    }
    var countButtons = document.querySelectorAll('.palette-count');
    for (var c = 0; c < countButtons.length; c++) {
      countButtons[c].className = Number(countButtons[c].getAttribute('data-palette-count')) === paletteCount
        ? 'palette-count active' : 'palette-count';
    }
  }

  paletteColorInput.value = paletteColors[0] || '#ffffff';
  paletteHexInput.value = paletteColorInput.value.toLowerCase();
  document.getElementById('paletteColorTrigger').style.setProperty('--swatch-color', paletteColorInput.value);
  renderPalette();
  renderPaletteHistory();
  renderSavedPalettes();
  var paletteCountButtons = document.querySelectorAll('.palette-count');
  for (var pc = 0; pc < paletteCountButtons.length; pc++) {
    paletteCountButtons[pc].addEventListener('click', function () {
      paletteCount = Number(this.getAttribute('data-palette-count'));
      if (selectedPaletteIndex >= paletteCount) {
        selectedPaletteIndex = -1;
        deletePaletteButton.disabled = true;
      }
      savePaletteData();
      renderPalette();
    });
  }
  paletteColorInput.addEventListener('input', function () {
    paletteHexInput.value = this.value.toLowerCase();
    document.getElementById('paletteColorTrigger').style.setProperty('--swatch-color', this.value);
    renderPalette();
  });
  paletteHexInput.addEventListener('input', function () {
    var color = getPaletteHex();
    if (color) {
      paletteHexInput.value = color;
      paletteColorInput.value = color;
      document.getElementById('paletteColorTrigger').style.setProperty('--swatch-color', color);
      renderPalette();
    }
  });

  function addPaletteColor(color) {
    if (!color) { setStatus('Masukkan kode HEX valid, contoh #33AAFF.'); return; }
    var existingIndex = paletteColors.indexOf(color);
    if (existingIndex >= 0) {
      selectPaletteColor(color, existingIndex);
      setStatus('Warna sudah ada di palette.');
      return;
    }
    if (paletteColors.length >= 7) {
      setStatus('Palette penuh. Pilih jumlah warna lebih banyak atau hapus satu warna.');
      return;
    }
    paletteCount = Math.max(paletteCount, paletteColors.length + 1);
    existingIndex = paletteColors.length;
    paletteColors.push(color);
    savePaletteData();
    selectPaletteColor(color, existingIndex);
    rememberPaletteColor(color);
    setStatus('Warna ' + color + ' disimpan.');
    logActivity('Custom palette', color + ' saved');
  }

  document.getElementById('btnAddPaletteColor').addEventListener('click', function () {
    addPaletteColor(getPaletteHex());
  });

  document.getElementById('btnArrangePalette').addEventListener('click', function () {
    var selectedColor = selectedPaletteIndex >= 0 ? paletteColors[selectedPaletteIndex] : null;
    arrangePaletteColors();
    selectedPaletteIndex = selectedColor ? paletteColors.indexOf(selectedColor) : -1;
    deletePaletteButton.disabled = selectedPaletteIndex < 0;
    savePaletteData();
    renderPalette();
    var arrangeButton = document.getElementById('btnArrangePalette');
    arrangeButton.textContent = 'Tersusun ✓';
    window.setTimeout(function () { arrangeButton.textContent = 'Atur'; }, 1100);
    setStatus('Warna palette disusun berdasarkan hue.');
  });

  deletePaletteButton.addEventListener('click', function () {
    if (selectedPaletteIndex < 0 || !paletteColors[selectedPaletteIndex]) return;
    var removedColor = paletteColors[selectedPaletteIndex];
    paletteColors.splice(selectedPaletteIndex, 1);
    selectedPaletteIndex = -1;
    deletePaletteButton.disabled = true;
    if (paletteColors.length) syncPaletteInputs(paletteColors[Math.min(paletteCount - 1, paletteColors.length - 1)]);
    savePaletteData();
    renderPalette();
    setStatus('Warna ' + removedColor + ' dihapus dari palette.');
    logActivity('Custom palette', removedColor + ' deleted');
  });

  document.getElementById('btnSavePalette').addEventListener('click', function () {
    var nameInput = document.getElementById('paletteName');
    var name = String(nameInput.value || '').replace(/^\s+|\s+$/g, '');
    if (!name) { setStatus('Masukkan nama palette.'); nameInput.focus(); return; }
    var entry = { name: name, colors: paletteColors.slice(0, 7), count: paletteCount };
    if (!entry.colors.length) { setStatus('Tambahkan warna sebelum menyimpan palette.'); return; }
    var existing = -1;
    for (var p = 0; p < savedPalettes.length; p++) {
      if (savedPalettes[p].name.toLowerCase() === name.toLowerCase()) { existing = p; break; }
    }
    if (existing >= 0) savedPalettes[existing] = entry;
    else savedPalettes.unshift(entry);
    savedPalettes = savedPalettes.slice(0, 20);
    savePalettesData();
    renderSavedPalettes();
    nameInput.value = '';
    setStatus('Palette "' + name + '" tersimpan.');
    logActivity('Color palette', name + ' saved');
  });

  document.getElementById('btnClearPaletteHistory').addEventListener('click', function () {
    paletteHistory = [];
    try { localStorage.removeItem('alaskaPaletteHistory'); } catch (ignore) {}
    renderPaletteHistory();
    setStatus('Riwayat warna dihapus.');
  });

  // Tombol Align
  var alignBtns = document.querySelectorAll('[data-align]');
  for (var i = 0; i < alignBtns.length; i++) {
    alignBtns[i].addEventListener('click', function () {
      var mode = this.getAttribute('data-align');
      runJsx('alaskaAlign("' + escapeJsxStr(mode) + '")', 'Align ' + mode);
    });
  }

  var graphValues = { inInfluence: 50, outInfluence: 50, inSpeed: 0, outSpeed: 0 };
  var currentGraphName = 'Manual Graph';
  var graphPreview = document.getElementById('graphPreview');
  var graphTemplates = {
    smooth: { inInfluence: 50, outInfluence: 50, inSpeed: 0, outSpeed: 0 },
    snappy: { inInfluence: 82, outInfluence: 82, inSpeed: 0, outSpeed: 0 },
    easeIn: { inInfluence: 80, outInfluence: 20, inSpeed: 0, outSpeed: 0 },
    easeOut: { inInfluence: 20, outInfluence: 80, inSpeed: 0, outSpeed: 0 },
    linear: { inInfluence: 1, outInfluence: 1, inSpeed: 0, outSpeed: 0 }
  };
  var savedGraphs = [];
  var graphHistory = [];
  try {
    savedGraphs = JSON.parse(localStorage.getItem('alaskaSavedGraphs') || '[]');
    graphHistory = JSON.parse(localStorage.getItem('alaskaGraphHistory') || '[]');
    if (Object.prototype.toString.call(savedGraphs) !== '[object Array]') savedGraphs = [];
    if (Object.prototype.toString.call(graphHistory) !== '[object Array]') graphHistory = [];
  } catch (ignore) { savedGraphs = []; graphHistory = []; }
  graphHistory = graphHistory.slice(0, 5).map(function (entry) {
    entry.name = 'Manual Graph';
    return entry;
  });
  try { localStorage.setItem('alaskaGraphHistory', JSON.stringify(graphHistory)); } catch (ignore) {}

  function readGraphValues() {
    return {
      inInfluence: graphValues.inInfluence,
      outInfluence: graphValues.outInfluence,
      inSpeed: graphValues.inSpeed,
      outSpeed: graphValues.outSpeed
    };
  }

  function drawGraph() {
    var values = readGraphValues();
    var outX = 16 + (values.outInfluence / 100) * 208;
    var outY = 74 - (values.outSpeed / 100) * 64;
    var inX = 224 - (values.inInfluence / 100) * 208;
    var inY = 10 + (values.inSpeed / 100) * 64;
    document.getElementById('graphOutHandle').setAttribute('cx', outX);
    document.getElementById('graphOutHandle').setAttribute('cy', outY);
    document.getElementById('graphInHandle').setAttribute('cx', inX);
    document.getElementById('graphInHandle').setAttribute('cy', inY);
    document.getElementById('graphOutTangent').setAttribute('d', 'M16 74 L' + outX + ' ' + outY);
    document.getElementById('graphInTangent').setAttribute('d', 'M224 10 L' + inX + ' ' + inY);
    document.getElementById('graphCurve').setAttribute('d', 'M16 74 C' + outX + ' ' + outY + ' ' + inX + ' ' + inY + ' 224 10');
    document.getElementById('graphFill').setAttribute('d', 'M16 74 C' + outX + ' ' + outY + ' ' + inX + ' ' + inY + ' 224 10 L224 74 Z');
    document.getElementById('graphOutReadout').innerText = 'OUT  ' + Math.round(values.outInfluence) + '% influence · ' + Math.round(values.outSpeed) + ' speed';
    document.getElementById('graphInReadout').innerText = 'IN  ' + Math.round(values.inInfluence) + '% influence · ' + Math.round(values.inSpeed) + ' speed';
  }

  function setGraphValues(values, presetName) {
    graphValues.inInfluence = Number(values.inInfluence);
    graphValues.outInfluence = Number(values.outInfluence);
    graphValues.inSpeed = Number(values.inSpeed);
    graphValues.outSpeed = Number(values.outSpeed);
    currentGraphName = presetName || 'Manual Graph';
    drawGraph();
  }

  function graphPointFromEvent(event) {
    var point = graphPreview.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(graphPreview.getScreenCTM().inverse());
  }

  function clampGraph(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function moveGraphHandle(event, handleType) {
    currentGraphName = 'Manual Graph';
    var point = graphPointFromEvent(event);
    if (handleType === 'out') {
      graphValues.outInfluence = Math.round(clampGraph(((point.x - 16) / 208) * 100, 1, 100));
      graphValues.outSpeed = Math.round(clampGraph(((74 - point.y) / 64) * 100, 0, 100));
    } else {
      graphValues.inInfluence = Math.round(clampGraph(((224 - point.x) / 208) * 100, 1, 100));
      graphValues.inSpeed = Math.round(clampGraph(((point.y - 10) / 64) * 100, 0, 100));
    }
    drawGraph();
  }

  var activeGraphHandle = null;
  graphPreview.addEventListener('pointerdown', function (event) {
    if (!event.target || !event.target.getAttribute) return;
    var handle = event.target.getAttribute('data-graph-handle');
    if (!handle) return;
    event.preventDefault();
    activeGraphHandle = handle;
    if (graphPreview.setPointerCapture) graphPreview.setPointerCapture(event.pointerId);
    moveGraphHandle(event, handle);
  });
  graphPreview.addEventListener('pointermove', function (event) {
    if (activeGraphHandle) moveGraphHandle(event, activeGraphHandle);
  });
  graphPreview.addEventListener('pointerup', function () { activeGraphHandle = null; });
  graphPreview.addEventListener('pointercancel', function () { activeGraphHandle = null; });

  function renderSavedGraphs() {
    var select = document.getElementById('savedGraphPreset');
    select.innerHTML = '<option value="" disabled selected>Pilih preset</option>';
    for (var s = 0; s < savedGraphs.length; s++) {
      var option = document.createElement('option');
      option.value = String(s);
      option.text = savedGraphs[s].name;
      select.appendChild(option);
    }
  }

  function recordGraphHistory(values, name) {
    var entry = {
      name: name || 'Manual Graph',
      inInfluence: values.inInfluence,
      outInfluence: values.outInfluence,
      inSpeed: values.inSpeed,
      outSpeed: values.outSpeed,
      time: new Date().toLocaleTimeString()
    };
    graphHistory = graphHistory.filter(function (oldEntry) {
      return !(oldEntry.name === entry.name && oldEntry.inInfluence === entry.inInfluence &&
        oldEntry.outInfluence === entry.outInfluence && oldEntry.inSpeed === entry.inSpeed && oldEntry.outSpeed === entry.outSpeed);
    });
    graphHistory = [entry].concat(graphHistory).slice(0, 5);
    try { localStorage.setItem('alaskaGraphHistory', JSON.stringify(graphHistory)); } catch (ignore) {}
    renderGraphHistory();
  }

  function renderGraphHistory() {
    var container = document.getElementById('graphHistory');
    container.innerHTML = '';
    if (!graphHistory.length) {
      container.innerText = 'Belum ada graph diterapkan.';
      return;
    }
    for (var h = 0; h < graphHistory.length; h++) {
      (function (entry) {
        var row = document.createElement('div');
        row.className = 'history-item';
        var title = document.createElement('span');
        title.innerText = entry.name + ' · In ' + entry.inInfluence + '% / Out ' + entry.outInfluence + '%';
        var load = document.createElement('button');
        load.type = 'button'; load.innerText = 'Load';
        load.addEventListener('click', function () { setGraphValues(entry, entry.name); });
        row.appendChild(title); row.appendChild(load); container.appendChild(row);
      })(graphHistory[h]);
    }
  }

  document.getElementById('btnClearGraphHistory').addEventListener('click', function () {
    graphHistory = [];
    try { localStorage.removeItem('alaskaGraphHistory'); } catch (ignore) {}
    renderGraphHistory();
    setStatus('Graph history cleared.');
  });

  var templateButtons = document.querySelectorAll('[data-graph-template]');
  for (var gt = 0; gt < templateButtons.length; gt++) {
    templateButtons[gt].addEventListener('click', function () {
      var template = graphTemplates[this.getAttribute('data-graph-template')];
      if (template) setGraphValues(template);
    });
  }
  renderSavedGraphs();
  renderGraphHistory();
  drawGraph();

  document.getElementById('btnSaveGraph').addEventListener('click', function () {
    var name = document.getElementById('graphPresetName').value.replace(/^\s+|\s+$/g, '');
    if (!name) { setStatus('Masukkan nama untuk menyimpan graph.'); return; }
    var values = readGraphValues();
    values.name = name;
    savedGraphs = savedGraphs.filter(function (entry) { return entry.name !== name; });
    savedGraphs.push(values);
    try { localStorage.setItem('alaskaSavedGraphs', JSON.stringify(savedGraphs)); } catch (ignore) {}
    renderSavedGraphs();
    setStatus('Graph preset "' + name + '" tersimpan.');
    logActivity('Graph preset', name + ' saved');
  });

  document.getElementById('btnLoadGraphPreset').addEventListener('click', function () {
    var index = Number(document.getElementById('savedGraphPreset').value);
    if (!isNaN(index) && savedGraphs[index]) {
      setGraphValues(savedGraphs[index], savedGraphs[index].name);
      recordGraphHistory(savedGraphs[index], savedGraphs[index].name);
      setStatus('Preset graph "' + savedGraphs[index].name + '" dimuat.');
    }
  });

  document.getElementById('btnDeleteGraphPreset').addEventListener('click', function () {
    var select = document.getElementById('savedGraphPreset');
    var index = Number(select.value);
    if (isNaN(index) || !savedGraphs[index]) { setStatus('Pilih saved graph yang akan dihapus.'); return; }
    var removedName = savedGraphs[index].name;
    savedGraphs.splice(index, 1);
    try { localStorage.setItem('alaskaSavedGraphs', JSON.stringify(savedGraphs)); } catch (ignore) {}
    renderSavedGraphs();
    setStatus('Graph preset "' + removedName + '" dihapus.');
  });

  document.getElementById('btnGraph').addEventListener('click', function () {
    var values = readGraphValues();
    var name = currentGraphName || 'Manual Graph';
    recordGraphHistory(values, name);
    runJsx('alaskaApplyCustomGraph(' + values.inSpeed + ', ' + values.inInfluence + ', ' + values.outSpeed + ', ' + values.outInfluence + ')', 'Apply ' + name);
  });

  // Tombol Precomp
  var btnPrecomp = document.getElementById('btnPrecomp');
  if (btnPrecomp) {
    btnPrecomp.addEventListener('click', function () {
      var nameVal = document.getElementById('precompName').value;
      var moveVal = document.getElementById('moveAttrs').checked;
      runJsx('alaskaAutoPrecomp("' + escapeJsxStr(nameVal) + '", ' + Boolean(moveVal) + ')', 'Auto Precomp');
    });
  }

  var btnColorBackground = document.getElementById('btnColorBackground');
  if (btnColorBackground) {
    btnColorBackground.addEventListener('click', function () {
      var color = document.getElementById('backgroundColor').value;
      var name = 'Alaska! Background';
      runJsx('alaskaAddColorBackground("' + escapeJsxStr(color) + '", "' + escapeJsxStr(name) + '")', 'Buat solid background');
    });
  }

  var btnAutoCut = document.getElementById('btnAutoCut');
  if (btnAutoCut) {
    btnAutoCut.addEventListener('click', function () {
      runJsx('alaskaCutAtPlayhead()', 'Potong layer di playhead');
    });
  }

  var btnBeatGrid = document.getElementById('btnBeatGrid');
  if (btnBeatGrid) {
    btnBeatGrid.addEventListener('click', function () {
      var bpm = Number(document.getElementById('beatBpm').value);
      runJsx('alaskaCreateBeatGrid(' + bpm + ')', 'Buat beat grid');
    });
  }

  document.getElementById('btnApply3d').addEventListener('click', function () {
    var enabled = document.getElementById('enable3d').checked;
    runJsx('alaskaSetSelected3D(' + Boolean(enabled) + ')', enabled ? 'Enable 3D layers' : 'Disable 3D layers');
  });

  document.getElementById('btnTrueComp').addEventListener('click', function () {
    var count = Math.max(1, Math.min(20, Number(document.getElementById('trueCompCount').value) || 1));
    document.getElementById('trueCompCount').value = String(count);
    runJsx('alaskaCreateTrueComp(' + count + ')', 'Create ' + count + ' isolated True Comp' + (count === 1 ? '' : ' copies'));
  });

  document.getElementById('btnRenameLayers').addEventListener('click', function () {
    var prefix = document.getElementById('layerPrefix').value || 'Layer_';
    runJsx('alaskaRenameSelectedLayers("' + escapeJsxStr(prefix) + '")', 'Rename selected layers');
  });

  document.getElementById('btnStagger').addEventListener('click', function () {
    var frames = Number(document.getElementById('staggerFrames').value);
    runJsx('alaskaStaggerSelectedLayers(' + frames + ')', 'Stagger selected layers');
  });

  var btnAiPlan = document.getElementById('btnAiPlan');
  var aiPrompt = document.getElementById('aiPrompt');
  var aiChatLog = document.getElementById('aiChatLog');
  var aiPlanContainer = document.getElementById('aiPlan');

  function addAiMessage(role, text) {
    var message = document.createElement('div');
    message.className = 'ai-message ' + role;
    message.textContent = text;
    aiChatLog.appendChild(message);
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
  }

  function sendAiMessage() {
    var promptText = String(aiPrompt.value || '').replace(/^\s+|\s+$/g, '');
    if (!promptText) return;
    addAiMessage('user', promptText);
    aiPrompt.value = '';
    aiPlanContainer.innerHTML = '';
    var prompt = promptText.toLowerCase();
    var proposals = [];
    var bpmMatch = prompt.match(/([0-9]{1,3})\s*bpm/);
    var colorMatch = prompt.match(/#[0-9a-f]{6}/i);
    var numericMatch;

    if (/^(help|bantuan|fitur|apa yang bisa kamu lakukan)[?.! ]*$/.test(prompt)) {
      addAiMessage('assistant', 'Saya bisa membantu precomp, align, Position, Scale, Opacity, Rotation, 3D, graph easing, solid warna, beat marker, cut, rename, dan stagger. Pilih layer/property di AE. Saya menjalankan aksi terdaftar saja; permintaan bebas yang belum didukung tidak dieksekusi.');
      return;
    }
    if (/\b3d\b|dimensi/.test(prompt)) {
      var enable3d = !/\b(2d|off|disable|matikan|nonaktif)\b/.test(prompt);
      proposals.push({ label: (enable3d ? 'Aktifkan' : 'Matikan') + ' switch 3D layer', code: 'alaskaSetSelected3D(' + enable3d + ')' });
    }
    if (/align|rata|tengah|center|kiri|kanan|atas|bawah|bottom|top/.test(prompt)) {
      var alignModes = [];
      if (/tengah|center|middle/.test(prompt)) alignModes = ['centerH', 'centerV'];
      else {
        if (/kiri|left/.test(prompt)) alignModes.push('left');
        if (/kanan|right/.test(prompt)) alignModes.push('right');
        if (/atas|\btop\b/.test(prompt)) alignModes.push('top');
        if (/bawah|bottom/.test(prompt)) alignModes.push('bottom');
      }
      for (var am = 0; am < alignModes.length; am++) proposals.push({ label: 'Align ' + alignModes[am], code: 'alaskaAlign("' + alignModes[am] + '")' });
    }
    if (/pre[- ]?comp|komposisi/.test(prompt)) {
      var namedComp = promptText.match(/(?:nama|name)\s+([a-z0-9 _-]+?)(?:\s+(?:lalu|dan|then)|$)/i);
      var compName = namedComp ? namedComp[1].replace(/^\s+|\s+$/g, '') : '';
      proposals.push({ label: 'Pre-compose layer terpilih' + (compName ? ' · ' + compName : ''), code: 'alaskaAutoPrecomp("' + escapeJsxStr(compName) + '", true)' });
    }
    if (/potong|\bcut\b|split/.test(prompt)) proposals.push({ label: 'Potong layer pada playhead', code: 'alaskaCutAtPlayhead()' });
    if (/beat|marker|tempo/.test(prompt) || bpmMatch) {
      var bpm = bpmMatch ? Math.max(1, Math.min(300, Number(bpmMatch[1]))) : 120;
      proposals.push({ label: 'Buat marker ' + bpm + ' BPM', code: 'alaskaCreateBeatGrid(' + bpm + ')' });
    }
    if (/graph|ease|smooth|snappy|linear|ease ?in|ease ?out/.test(prompt)) {
      var graphKey = /snappy/.test(prompt) ? 'snappy' : /linear/.test(prompt) ? 'linear' : /ease ?in/.test(prompt) ? 'easeIn' : /ease ?out/.test(prompt) ? 'easeOut' : 'smooth';
      var graph = graphTemplates[graphKey] || graphTemplates.smooth;
      proposals.push({ label: 'Terapkan graph ' + graphKey, code: 'alaskaApplyCustomGraph(' + graph.inSpeed + ',' + graph.inInfluence + ',' + graph.outSpeed + ',' + graph.outInfluence + ')' });
    }
    if (/solid|background|latar|warna/.test(prompt) && colorMatch) proposals.push({ label: 'Buat solid ' + colorMatch[0], code: 'alaskaAddColorBackground("' + colorMatch[0] + '","Alaska AI Color")' });
    if (/rename|ganti nama|ubah nama/.test(prompt)) {
      var prefixMatch = promptText.match(/(?:prefix|awalan)\s+["']?([a-z0-9_-]+)/i);
      var prefix = prefixMatch ? prefixMatch[1] : (document.getElementById('layerPrefix').value || 'Layer_');
      proposals.push({ label: 'Rename layer · ' + prefix, code: 'alaskaRenameSelectedLayers("' + escapeJsxStr(prefix) + '")' });
    }
    if (/stagger|bertahap|jarak layer/.test(prompt)) {
      numericMatch = prompt.match(/([0-9]{1,3})\s*(?:frame|frames|frm)/);
      var frames = numericMatch ? Math.max(0, Math.min(300, Number(numericMatch[1]))) : Number(document.getElementById('staggerFrames').value) || 2;
      proposals.push({ label: 'Stagger tiap ' + frames + ' frame', code: 'alaskaStaggerSelectedLayers(' + frames + ')' });
    }
    if (/position|posisi/.test(prompt)) {
      numericMatch = prompt.match(/(?:position|posisi)\s*(?:ke\s*)?(-?\d+(?:\.\d+)?)\s*[,\s]+(-?\d+(?:\.\d+)?)(?:\s*[,\s]+(-?\d+(?:\.\d+)?))?/);
      if (numericMatch) proposals.push({ label: 'Position ' + numericMatch[1] + ', ' + numericMatch[2], code: 'alaskaSetSelectedTransform("position",' + Number(numericMatch[1]) + ',' + Number(numericMatch[2]) + ',' + (numericMatch[3] ? Number(numericMatch[3]) : 'undefined') + ')' });
    }
    if (/scale|skala/.test(prompt)) {
      numericMatch = prompt.match(/(?:scale|skala)\s*(?:ke\s*)?([0-9]{1,3}(?:\.[0-9]+)?)\s*%?/);
      if (numericMatch) proposals.push({ label: 'Scale ' + numericMatch[1] + '%', code: 'alaskaSetSelectedTransform("scale",' + Number(numericMatch[1]) + ',undefined,undefined)' });
    }
    if (/opacity|opasitas|transparansi/.test(prompt)) {
      numericMatch = prompt.match(/(?:opacity|opasitas|transparansi)\s*(?:ke\s*)?([0-9]{1,3}(?:\.[0-9]+)?)\s*%?/);
      if (numericMatch) proposals.push({ label: 'Opacity ' + numericMatch[1] + '%', code: 'alaskaSetSelectedTransform("opacity",' + Number(numericMatch[1]) + ',undefined,undefined)' });
    }
    if (/rotation|rotasi|rotate/.test(prompt)) {
      numericMatch = prompt.match(/(?:rotation|rotasi|rotate)\s*(?:ke\s*)?(-?[0-9]{1,3}(?:\.[0-9]+)?)\s*(?:deg|derajat)?/);
      if (numericMatch) proposals.push({ label: 'Rotation ' + numericMatch[1] + '°', code: 'alaskaSetSelectedTransform("rotation",' + Number(numericMatch[1]) + ',undefined,undefined)' });
    }

    if (!proposals.length) {
      addAiMessage('assistant', 'Saya belum memahami aksi itu. Contoh: “align center”, “position 500 300”, “scale 80%”, “opacity 50%”, “rotation 15”, “buat precomp”, atau “graph smooth”.');
      return;
    }
    addAiMessage('assistant', 'Saya siapkan ' + proposals.length + ' aksi. Periksa pilihan layer di After Effects, lalu jalankan yang Anda setujui:\n' + proposals.map(function (entry, index) { return (index + 1) + '. ' + entry.label; }).join('\n'));
    for (var ap = 0; ap < proposals.length; ap++) {
      (function (proposal, number) {
        var row = document.createElement('div'); row.className = 'ai-proposal';
        var content = document.createElement('div'); content.className = 'ai-proposal-row';
        var label = document.createElement('span'); label.textContent = (number + 1) + '. ' + proposal.label;
        var execute = document.createElement('button'); execute.type = 'button'; execute.textContent = 'Jalankan';
        execute.addEventListener('click', function () {
          execute.disabled = true; execute.textContent = 'Menunggu…';
          runJsx(proposal.code, 'Alaska Assistant: ' + proposal.label, true, function (completed) {
            execute.textContent = completed ? 'Selesai' : 'Coba lagi';
            if (!completed) execute.disabled = false;
          });
        });
        content.appendChild(label); content.appendChild(execute); row.appendChild(content); aiPlanContainer.appendChild(row);
      })(proposals[ap], ap);
    }
    logActivity('Alaska Assistant', proposals.length + ' aksi disiapkan');
  }

  if (btnAiPlan) btnAiPlan.addEventListener('click', sendAiMessage);
  aiPrompt.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendAiMessage(); }
  });
});