function alaskaApplyGraph(presetName, influenceVal) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Pilih Composition aktif terlebih dahulu.";
  }

  var selProps = comp.selectedProperties;
  if (!selProps || selProps.length === 0) {
    return "Error: Pilih property yang memiliki keyframe.";
  }

  var inf = Number(influenceVal);
  if (isNaN(inf) || inf < 1) inf = 33.33;
  if (inf > 100) inf = 100;

  // Preset sederhana: [inEaseSpeed, inEaseInf, outEaseSpeed, outEaseInf]
  var presets = {
    "smooth": [0, inf, 0, inf],
    "snappy": [0, Math.min(100, inf + 25), 0, Math.min(100, inf + 25)],
    "linear": [0, 0.1, 0, 0.1]
  };

  var cfg = presets[presetName] || presets["smooth"];
  var totalKeys = 0;

  app.beginUndoGroup("Alaska! Graph Easing");
  try {
    for (var p = 0; p < selProps.length; p++) {
      var prop = selProps[p];
      if (!prop.canVaryOverTime || prop.selectedKeys.length === 0) continue;

      var dimCount = 1;
      if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) {
        dimCount = 2;
      } else if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
        dimCount = 3;
      }

      var keys = prop.selectedKeys;
      for (var k = 0; k < keys.length; k++) {
        var keyIndex = keys[k];
        var easeInArr = [];
        var easeOutArr = [];
        for (var d = 0; d < dimCount; d++) {
          easeInArr.push(new KeyframeEase(cfg[0], cfg[1]));
          easeOutArr.push(new KeyframeEase(cfg[2], cfg[3]));
        }
        try {
          prop.setTemporalEaseAtKey(keyIndex, easeInArr, easeOutArr);
          totalKeys++;
        } catch (eKey) {
          // Lewati keyframe yang tidak mendukung temporal ease (seperti marker/hold)
        }
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