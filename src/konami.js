"use strict";

var KONAMI_PATTERN = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

function createKonamiHandler(onMatch) {
  var keyCodes = new Array(KONAMI_PATTERN.length);
  for (var i = 0; i < keyCodes.length; i++) {
    keyCodes[i] = undefined;
  }

  function keydownHandler(e) {
    if (!e) {
      return;
    }
    keyCodes.shift();
    keyCodes.push(e.keyCode);
    if (
      keyCodes.every(function (element, index) {
        return element === KONAMI_PATTERN[index];
      })
    ) {
      onMatch();
    }
  }

  function getKeyCodes() {
    return keyCodes.slice();
  }

  function reset() {
    for (var i = 0; i < keyCodes.length; i++) {
      keyCodes[i] = undefined;
    }
  }

  return {
    keydownHandler: keydownHandler,
    getKeyCodes: getKeyCodes,
    reset: reset,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createKonamiHandler: createKonamiHandler, KONAMI_PATTERN: KONAMI_PATTERN };
}
