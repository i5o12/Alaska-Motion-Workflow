function alaskaPing() {
  var comp = app.project.activeItem;
  var compInfo = (comp && comp instanceof CompItem) ? ("Comp aktif: " + comp.name) : "Tidak ada Comp aktif";
  return "Alaska! JSX OK (" + compInfo + ")";
}

function alaskaAlign(mode) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var sel = comp.selectedLayers;
  if (!sel || sel.length === 0) {
    return "Error: Pilih minimal 1 layer di timeline.";
  }

  app.beginUndoGroup("Alaska! Align");
  var count = 0;
  try {
    var compW = comp.width;
    var compH = comp.height;

    for (var i = 0; i < sel.length; i++) {
      var layer = sel[i];
      var transform = layer.property("ADBE Transform Group");
      if (!transform) continue;

      var posProp = transform.property("ADBE Position");
      if (!posProp) continue;

      // Jika Position dipisah (Separate Dimensions), pakai X Position & Y Position
      if (posProp.dimensionsSeparated) {
        var xProp = transform.property("ADBE Position_0");
        var yProp = transform.property("ADBE Position_1");
        if (mode === "left" && xProp) xProp.setValue(0);
        else if (mode === "centerH" && xProp) xProp.setValue(compW / 2);
        else if (mode === "right" && xProp) xProp.setValue(compW);
        else if (mode === "top" && yProp) yProp.setValue(0);
        else if (mode === "centerV" && yProp) yProp.setValue(compH / 2);
        else if (mode === "bottom" && yProp) yProp.setValue(compH);
        count++;
      } else {
        var curPos = posProp.value;
        var x = curPos[0];
        var y = curPos[1];

        if (mode === "left") x = 0;
        else if (mode === "centerH") x = compW / 2;
        else if (mode === "right") x = compW;
        else if (mode === "top") y = 0;
        else if (mode === "centerV") y = compH / 2;
        else if (mode === "bottom") y = compH;

        if (curPos.length === 3) {
          posProp.setValue([x, y, curPos[2]]);
        } else {
          posProp.setValue([x, y]);
        }
        count++;
      }
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error Align: " + err.toString();
  }
  app.endUndoGroup();
  return "Align (" + mode + ") sukses ke " + count + " layer.";
}

function alaskaAutoPrecomp(customName, moveAttrs) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var sel = comp.selectedLayers;
  if (!sel || sel.length === 0) {
    return "Error: Pilih minimal 1 layer untuk di-precomp.";
  }

  app.beginUndoGroup("Alaska! Auto Precomp");
  try {
    var indices = [];
    for (var i = 0; i < sel.length; i++) {
      indices.push(sel[i].index);
    }

    var cleanName = (customName && customName.replace(/^\s+|\s+$/g, "") !== "")
      ? customName
      : "Precomp";

    var newComp = comp.layers.precompose(indices, cleanName, Boolean(moveAttrs));
    app.endUndoGroup();
    return "Precomp berhasil: '" + newComp.name + "'";
  } catch (err) {
    app.endUndoGroup();
    return "Error Precomp: " + err.toString();
  }
}

function alaskaApplyGraph(presetName, influenceVal) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var selProps = comp.selectedProperties;
  if (!selProps || selProps.length === 0) {
    return "Error: Klik/pilih property yang punya keyframe (misal Position atau Scale).";
  }

  var inf = Number(influenceVal);
  if (isNaN(inf) || inf < 1) inf = 33.33;
  if (inf > 100) inf = 100;

  var infOut = inf;
  if (presetName === "snappy") {
    infOut = Math.min(100, inf + 25);
  } else if (presetName === "linear") {
    inf = 0.1;
    infOut = 0.1;
  }

  var totalKeys = 0;
  app.beginUndoGroup("Alaska! Graph Easing");
  try {
    for (var p = 0; p < selProps.length; p++) {
      var prop = selProps[p];
      if (!prop || !prop.canVaryOverTime || !prop.selectedKeys || prop.selectedKeys.length === 0) {
        continue;
      }

      var dimCount = 1;
      if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) {
        dimCount = 2;
      } else if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
        dimCount = 3;
      }

      var keys = prop.selectedKeys;
      for (var k = 0; k < keys.length; k++) {
        var keyIdx = keys[k];
        var easeInArr = [];
        var easeOutArr = [];
        for (var d = 0; d < dimCount; d++) {
          easeInArr.push(new KeyframeEase(0, inf));
          easeOutArr.push(new KeyframeEase(0, infOut));
        }
        try {
          prop.setTemporalEaseAtKey(keyIdx, easeInArr, easeOutArr);
          totalKeys++;
        } catch (eKey) {}
      }
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error Graph: " + err.toString();
  }
  app.endUndoGroup();

  if (totalKeys === 0) {
    return "Tidak ada keyframe terpilih yang bisa di-ease.";
  }
  return "Graph (" + presetName + ") diterapkan ke " + totalKeys + " keyframe.";
}

function alaskaAddColorBackground(hexColor, layerName) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var match = /^#?([0-9a-f]{6})$/i.exec(String(hexColor || ""));
  if (!match) return "Error: Format warna harus hex, contoh #253B5C.";

  var hex = match[1];
  var color = [
    parseInt(hex.substring(0, 2), 16) / 255,
    parseInt(hex.substring(2, 4), 16) / 255,
    parseInt(hex.substring(4, 6), 16) / 255
  ];
  var cleanName = (layerName && layerName.replace(/^\s+|\s+$/g, "")) || "Alaska! Background";

  app.beginUndoGroup("Alaska! Custom Color Background");
  try {
    var solid = comp.layers.addSolid(color, cleanName, comp.width, comp.height, comp.pixelAspect, comp.duration);
    solid.moveToEnd();
    app.endUndoGroup();
    return "Solid background dibuat: '" + solid.name + "'.";
  } catch (err) {
    app.endUndoGroup();
    return "Error Background: " + err.toString();
  }
}

function alaskaCutAtPlayhead() {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var selected = comp.selectedLayers;
  if (!selected || selected.length === 0) return "Pilih minimal 1 layer untuk dipotong.";

  var cutTime = comp.time;
  var layers = [];
  for (var i = 0; i < selected.length; i++) layers.push(selected[i]);

  app.beginUndoGroup("Alaska! Cut at Playhead");
  var cutCount = 0;
  try {
    for (var j = 0; j < layers.length; j++) {
      var layer = layers[j];
      if (cutTime > layer.inPoint && cutTime < layer.outPoint) {
        layer.splitLayer(cutTime);
        cutCount++;
      }
    }
    app.endUndoGroup();
    return cutCount > 0
      ? "Playhead cut berhasil pada " + cutCount + " layer."
      : "Tidak ada selected layer yang melewati playhead.";
  } catch (err) {
    app.endUndoGroup();
    return "Error Cut: " + err.toString();
  }
}

function alaskaCreateBeatGrid(bpm) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Buka/pilih Composition aktif dulu.";
  }

  var tempo = Number(bpm);
  if (isNaN(tempo) || tempo < 1 || tempo > 300) {
    return "Error: BPM harus berada di antara 1 dan 300.";
  }

  var interval = 60 / tempo;
  var markerProperty = comp.markerProperty;
  if (!markerProperty) return "Error: Marker property composition tidak tersedia.";

  app.beginUndoGroup("Alaska! Create Beat Grid");
  var markerCount = 0;
  try {
    for (var time = 0; time < comp.duration; time += interval) {
      var marker = new MarkerValue("Beat " + (markerCount + 1));
      markerProperty.setValueAtTime(time, marker);
      markerCount++;
    }
    app.endUndoGroup();
    return "Beat grid " + tempo + " BPM dibuat: " + markerCount + " marker. Ini grid tempo, bukan analisis audio.";
  } catch (err) {
    app.endUndoGroup();
    return "Error Beat Grid: " + err.toString();
  }
}

function alaskaApplyCustomGraph(inSpeed, inInfluence, outSpeed, outInfluence) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return "Error: Buka/pilih Composition aktif dulu.";
  var props = comp.selectedProperties;
  if (!props || props.length === 0) return "Pilih property yang memiliki keyframe terpilih.";

  var speedIn = Math.max(0, Number(inSpeed) || 0);
  var influenceIn = Math.max(1, Math.min(100, Number(inInfluence) || 50));
  var speedOut = Math.max(0, Number(outSpeed) || 0);
  var influenceOut = Math.max(1, Math.min(100, Number(outInfluence) || 50));
  var totalKeys = 0;

  app.beginUndoGroup("Alaska! Manual Graph Easing");
  try {
    for (var p = 0; p < props.length; p++) {
      var prop = props[p];
      if (!prop || !prop.canVaryOverTime || !prop.selectedKeys || prop.selectedKeys.length === 0) continue;
      var dimCount = 1;
      if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) dimCount = 2;
      else if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) dimCount = 3;
      var keys = prop.selectedKeys;
      for (var k = 0; k < keys.length; k++) {
        var easeIn = [];
        var easeOut = [];
        for (var d = 0; d < dimCount; d++) {
          easeIn.push(new KeyframeEase(speedIn, influenceIn));
          easeOut.push(new KeyframeEase(speedOut, influenceOut));
        }
        try { prop.setTemporalEaseAtKey(keys[k], easeIn, easeOut); totalKeys++; } catch (keyError) {}
      }
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error Graph: " + err.toString();
  }
  app.endUndoGroup();
  return totalKeys ? "Manual graph diterapkan ke " + totalKeys + " keyframe." : "Tidak ada keyframe terpilih yang dapat di-ease.";
}

function alaskaSetSelected3D(enabled) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return "Error: Buka/pilih Composition aktif dulu.";
  var layers = comp.selectedLayers;
  if (!layers || !layers.length) return "Pilih layer yang akan diubah ke 3D.";
  var changed = 0;
  app.beginUndoGroup("Alaska! Set 3D Layers");
  try {
    for (var i = 0; i < layers.length; i++) {
      try { layers[i].threeDLayer = Boolean(enabled); changed++; } catch (layerError) {}
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error 3D: " + err.toString();
  }
  app.endUndoGroup();
  return "3D switch diterapkan ke " + changed + " layer.";
}

function alaskaRenameSelectedLayers(prefix) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return "Error: Buka/pilih Composition aktif dulu.";
  var layers = comp.selectedLayers;
  if (!layers || !layers.length) return "Pilih layer yang akan di-rename.";
  var safePrefix = String(prefix || "Layer_");
  app.beginUndoGroup("Alaska! Rename Selected Layers");
  try {
    for (var i = 0; i < layers.length; i++) {
      var number = (i + 1 < 10 ? "0" : "") + (i + 1);
      layers[i].name = safePrefix + number;
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error Rename: " + err.toString();
  }
  app.endUndoGroup();
  return "Berhasil rename " + layers.length + " layer.";
}

function alaskaStaggerSelectedLayers(frameOffset) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return "Error: Buka/pilih Composition aktif dulu.";
  var layers = comp.selectedLayers;
  if (!layers || layers.length < 2) return "Pilih minimal 2 layer untuk stagger.";
  var frames = Number(frameOffset);
  if (isNaN(frames) || frames < 0 || frames > 300) return "Frame offset harus antara 0 dan 300.";
  var offset = frames * comp.frameDuration;
  app.beginUndoGroup("Alaska! Stagger Selected Layers");
  try {
    for (var i = 0; i < layers.length; i++) layers[i].startTime += offset * i;
  } catch (err) {
    app.endUndoGroup();
    return "Error Stagger: " + err.toString();
  }
  app.endUndoGroup();
  return "Stagger " + layers.length + " layer dengan offset " + frames + " frame.";
}

function alaskaSetSelectedTransform(transformName, valueA, valueB, valueC) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return "Error: Buka/pilih Composition aktif dulu.";
  var layers = comp.selectedLayers;
  if (!layers || !layers.length) return "Pilih layer yang akan diubah.";
  var groupName = "ADBE Transform Group";
  var propertyName = String(transformName || "").toLowerCase();
  var values = [Number(valueA), Number(valueB), Number(valueC)];
  if (isNaN(values[0])) return "Nilai transform tidak valid.";
  var changed = 0;
  app.beginUndoGroup("Alaska! Set " + propertyName);
  try {
    for (var i = 0; i < layers.length; i++) {
      var group = layers[i].property(groupName);
      if (!group) continue;
      if (propertyName === "position") {
        if (isNaN(values[1])) continue;
        var position = group.property("ADBE Position");
        if (!position) continue;
        if (position.dimensionsSeparated) {
          var xPosition = group.property("ADBE Position_0");
          var yPosition = group.property("ADBE Position_1");
          if (xPosition) xPosition.setValue(values[0]);
          if (yPosition) yPosition.setValue(values[1]);
        } else {
          var oldPosition = position.value;
          if (oldPosition.length > 2) position.setValue([values[0], values[1], isNaN(values[2]) ? oldPosition[2] : values[2]]);
          else position.setValue([values[0], values[1]]);
        }
        changed++;
      } else if (propertyName === "scale") {
        var scale = group.property("ADBE Scale");
        if (!scale) continue;
        var oldScale = scale.value;
        var scaleY = isNaN(values[1]) ? values[0] : values[1];
        if (oldScale.length > 2) scale.setValue([values[0], scaleY, isNaN(values[2]) ? values[0] : values[2]]);
        else scale.setValue([values[0], scaleY]);
        changed++;
      } else if (propertyName === "opacity") {
        var opacity = group.property("ADBE Opacity");
        if (!opacity) continue;
        opacity.setValue(Math.max(0, Math.min(100, values[0])));
        changed++;
      } else if (propertyName === "rotation") {
        var rotation = group.property("ADBE Rotate Z");
        if (!rotation) rotation = group.property("ADBE Rotation");
        if (!rotation) continue;
        rotation.setValue(values[0]);
        changed++;
      }
    }
    app.endUndoGroup();
    return changed ? propertyName + " diubah pada " + changed + " layer." : "Tidak ada property " + propertyName + " yang dapat diubah.";
  } catch (err) {
    app.endUndoGroup();
    return "Error transform: " + err.toString();
  }
}

function alaskaCreateTrueComp(copyCount) {
  var activeComp = app.project.activeItem;
  if (!activeComp || !(activeComp instanceof CompItem)) return "Error: Buka composition yang berisi layer comp terlebih dahulu.";
  var selectedLayers = activeComp.selectedLayers;
  if (!selectedLayers || selectedLayers.length === 0) return "Pilih layer composition yang ingin dibuat True Comp.";
  var count = parseInt(copyCount, 10);
  if (isNaN(count)) count = 1;
  count = Math.max(1, Math.min(20, count));

  var roots = [];
  for (var i = 0; i < selectedLayers.length; i++) {
    var source = selectedLayers[i].source;
    if (source && source instanceof CompItem) roots.push({ layer: selectedLayers[i], source: source, layerName: selectedLayers[i].name });
  }
  if (!roots.length) return "Layer terpilih tidak berisi source composition.";

  var copiedCount = 0;

  function cloneCompTree(sourceComp, sourceIds, copies) {
    for (var m = 0; m < sourceIds.length; m++) {
      if (sourceIds[m] === sourceComp.id) return copies[m];
    }

    var duplicate = sourceComp.duplicate();
    duplicate.name = sourceComp.name + " - True Comp";
    sourceIds.push(sourceComp.id);
    copies.push(duplicate);
    copiedCount++;

    // Clone and relink nested comps too, so edits anywhere in this branch
    // cannot leak back into the original comp hierarchy.
    for (var layerIndex = 1; layerIndex <= duplicate.numLayers; layerIndex++) {
      var nestedLayer = duplicate.layer(layerIndex);
      var nestedSource = nestedLayer.source;
      if (nestedSource && nestedSource instanceof CompItem) {
        nestedLayer.replaceSource(cloneCompTree(nestedSource, sourceIds, copies), false);
      }
    }
    return duplicate;
  }

  app.beginUndoGroup("Alaska! Create True Comp");
  try {
    for (var rootIndex = 0; rootIndex < roots.length; rootIndex++) {
      for (var copyIndex = 0; copyIndex < count; copyIndex++) {
        var targetLayer = copyIndex === 0 ? roots[rootIndex].layer : roots[rootIndex].layer.duplicate();
        if (copyIndex > 0) targetLayer.name = roots[rootIndex].layerName + " - True Comp " + (copyIndex + 1);
        targetLayer.replaceSource(cloneCompTree(roots[rootIndex].source, [], []), false);
      }
    }
    app.endUndoGroup();
    return "True Comp selesai: " + (roots.length * count) + " layer memakai salinan terisolasi (" + count + " per layer terpilih; " + copiedCount + " comp disalin). Comp sumber tetap tidak berubah.";
  } catch (err) {
    app.endUndoGroup();
    return "Error True Comp: " + err.toString();
  }
}