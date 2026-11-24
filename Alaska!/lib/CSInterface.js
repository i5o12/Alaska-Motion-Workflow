(function (global) {
	"use strict";

	function CSInterface() {
		this._cep = global.__adobe_cep__ || null;
	}

	CSInterface.prototype.evalScript = function (script, callback) {
		var done = typeof callback === "function" ? callback : function () {};

		if (!this._cep || typeof this._cep.evalScript !== "function") {
			done("Error: CEP bridge tidak tersedia. Buka extension dari dalam After Effects.");
			return;
		}

		this._cep.evalScript(String(script), done);
	};

	global.CSInterface = CSInterface;
})(window);
