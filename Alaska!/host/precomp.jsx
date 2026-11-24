function alaskaAutoPrecomp(customName, moveAttrs) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return "Error: Pilih Composition aktif terlebih dahulu.";
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

    var baseName = (customName && customName.replace(/\s+/g, "") !== "")
      ? customName
      : "Precomp";

    var newComp = comp.layers.precompose(indices, baseName, Boolean(moveAttrs));
    app.endUndoGroup();
    return "Auto Precomp selesai: '" + newComp.name + "'";
  } catch (err) {
    app.endUndoGroup();
    return "Error Precomp: " + err.toString();
  }
}