function alaskaAlign(mode, targetMode) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Pilih Composition aktif terlebih dahulu.";
  }

  var sel = comp.selectedLayers;
  if (!sel || sel.length === 0) {
    return "Error: Pilih minimal 1 layer.";
  }

  app.beginUndoGroup("Alaska! Align");
  try {
    var compW = comp.width;
    var compH = comp.height;

    for (var i = 0; i < sel.length; i++) {
      var layer = sel[i];
      var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
      if (!posProp) continue;

      var curPos = posProp.value;
      var x = curPos[0];
      var y = curPos[1];
      var z = curPos.length > 2 ? curPos[2] : 0;

      // Menggunakan titik acuan sederhana berbasis ukuran comp (bisa dikembangkan ke sourceRectAtTime)
      if (mode === "left") x = 0;
      else if (mode === "centerH") x = compW / 2;
      else if (mode === "right") x = compW;
      else if (mode === "top") y = 0;
      else if (mode === "centerV") y = compH / 2;
      else if (mode === "bottom") y = compH;

      posProp.setValue(curPos.length > 2 ? [x, y, z] : [x, y]);
    }
  } catch (err) {
    app.endUndoGroup();
    return "Error Align: " + err.toString();
  }
  app.endUndoGroup();
  return "Align (" + mode + ") berhasil diterapkan ke " + sel.length + " layer.";
}