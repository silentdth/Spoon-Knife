"use strict";

var mod = require("../src/konami");
var createKonamiHandler = mod.createKonamiHandler;
var KONAMI_PATTERN = mod.KONAMI_PATTERN;

function pressKey(handler, keyCode) {
  handler.keydownHandler({ keyCode: keyCode });
}

function pressSequence(handler, codes) {
  codes.forEach(function (code) {
    pressKey(handler, code);
  });
}

describe("KONAMI_PATTERN", function () {
  it("should be the classic Konami code sequence", function () {
    expect(KONAMI_PATTERN).toEqual([38, 38, 40, 40, 37, 39, 37, 39, 66, 65]);
  });

  it("should have exactly 10 entries", function () {
    expect(KONAMI_PATTERN).toHaveLength(10);
  });
});

describe("createKonamiHandler", function () {
  it("should return an object with keydownHandler, getKeyCodes, and reset", function () {
    var handler = createKonamiHandler(function () {});
    expect(typeof handler.keydownHandler).toBe("function");
    expect(typeof handler.getKeyCodes).toBe("function");
    expect(typeof handler.reset).toBe("function");
  });
});

describe("keydownHandler", function () {
  var onMatch;
  var handler;

  beforeEach(function () {
    onMatch = jest.fn();
    handler = createKonamiHandler(onMatch);
  });

  it("should not call onMatch for a single key press", function () {
    pressKey(handler, 38);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should not call onMatch for random key presses", function () {
    for (var i = 0; i < 20; i++) {
      pressKey(handler, 13); // Enter key
    }
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should call onMatch when the full Konami code is entered", function () {
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it("should call onMatch each time the code is entered", function () {
    pressSequence(handler, KONAMI_PATTERN);
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(2);
  });

  it("should not call onMatch for a partial sequence", function () {
    pressSequence(handler, KONAMI_PATTERN.slice(0, 9));
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should not call onMatch if the pattern is reversed", function () {
    var reversed = KONAMI_PATTERN.slice().reverse();
    pressSequence(handler, reversed);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should not call onMatch when pattern has an incorrect key in the middle", function () {
    var broken = KONAMI_PATTERN.slice();
    broken[5] = 99;
    pressSequence(handler, broken);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should still match after noise keys followed by the correct pattern", function () {
    pressSequence(handler, [1, 2, 3, 4, 5]);
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it("should handle the pattern entered with extra keys interspersed (should not match)", function () {
    // up, up, NOISE, down, down, left, right, left, right, B, A
    pressSequence(handler, [38, 38, 99, 40, 40, 37, 39, 37, 39, 66, 65]);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should match when exactly 10 correct keys are pressed after many wrong ones", function () {
    for (var i = 0; i < 100; i++) {
      pressKey(handler, 0);
    }
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it("should not match if only the last key is wrong", function () {
    pressSequence(handler, KONAMI_PATTERN.slice(0, 9));
    pressKey(handler, 66); // B instead of A
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should not match if only the first key is wrong", function () {
    pressKey(handler, 40); // down instead of up
    pressSequence(handler, KONAMI_PATTERN.slice(1));
    expect(onMatch).not.toHaveBeenCalled();
  });
});

describe("getKeyCodes", function () {
  var handler;

  beforeEach(function () {
    handler = createKonamiHandler(function () {});
  });

  it("should return a buffer of 10 undefined values initially", function () {
    var codes = handler.getKeyCodes();
    expect(codes).toHaveLength(10);
    codes.forEach(function (code) {
      expect(code).toBeUndefined();
    });
  });

  it("should reflect pressed keys in the buffer", function () {
    pressKey(handler, 38);
    var codes = handler.getKeyCodes();
    expect(codes[9]).toBe(38);
    expect(codes[8]).toBeUndefined();
  });

  it("should return a copy (not a reference to the internal buffer)", function () {
    var codes1 = handler.getKeyCodes();
    pressKey(handler, 42);
    var codes2 = handler.getKeyCodes();
    expect(codes1[9]).toBeUndefined();
    expect(codes2[9]).toBe(42);
  });

  it("should maintain a sliding window of the last 10 keys", function () {
    for (var i = 1; i <= 15; i++) {
      pressKey(handler, i);
    }
    var codes = handler.getKeyCodes();
    expect(codes).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });
});

describe("reset", function () {
  it("should clear the key buffer back to all undefined", function () {
    var handler = createKonamiHandler(function () {});
    pressSequence(handler, [1, 2, 3, 4, 5]);
    handler.reset();
    var codes = handler.getKeyCodes();
    codes.forEach(function (code) {
      expect(code).toBeUndefined();
    });
  });

  it("should allow the Konami code to be entered again after reset", function () {
    var onMatch = jest.fn();
    var handler = createKonamiHandler(onMatch);
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(1);
    handler.reset();
    pressSequence(handler, KONAMI_PATTERN);
    expect(onMatch).toHaveBeenCalledTimes(2);
  });

  it("should prevent a partial pre-reset sequence from completing post-reset", function () {
    var onMatch = jest.fn();
    var handler = createKonamiHandler(onMatch);
    pressSequence(handler, KONAMI_PATTERN.slice(0, 5));
    handler.reset();
    pressSequence(handler, KONAMI_PATTERN.slice(5));
    expect(onMatch).not.toHaveBeenCalled();
  });
});

describe("multiple independent handlers", function () {
  it("should track key presses independently", function () {
    var onMatch1 = jest.fn();
    var onMatch2 = jest.fn();
    var handler1 = createKonamiHandler(onMatch1);
    var handler2 = createKonamiHandler(onMatch2);

    pressSequence(handler1, KONAMI_PATTERN);
    expect(onMatch1).toHaveBeenCalledTimes(1);
    expect(onMatch2).not.toHaveBeenCalled();

    pressSequence(handler2, KONAMI_PATTERN);
    expect(onMatch2).toHaveBeenCalledTimes(1);
  });
});

describe("edge cases", function () {
  var handler;
  var onMatch;

  beforeEach(function () {
    onMatch = jest.fn();
    handler = createKonamiHandler(onMatch);
  });

  it("should ignore null or undefined event objects", function () {
    handler.keydownHandler(null);
    handler.keydownHandler(undefined);
    expect(onMatch).not.toHaveBeenCalled();
    var codes = handler.getKeyCodes();
    codes.forEach(function (code) {
      expect(code).toBeUndefined();
    });
  });

  it("should handle event objects with additional properties", function () {
    handler.keydownHandler({ keyCode: 38, key: "ArrowUp", which: 38 });
    expect(handler.getKeyCodes()[9]).toBe(38);
  });

  it("should handle keyCode 0", function () {
    pressKey(handler, 0);
    expect(handler.getKeyCodes()[9]).toBe(0);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should handle very large keyCode values", function () {
    pressKey(handler, 999999);
    expect(handler.getKeyCodes()[9]).toBe(999999);
    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should handle negative keyCode values", function () {
    pressKey(handler, -1);
    expect(handler.getKeyCodes()[9]).toBe(-1);
    expect(onMatch).not.toHaveBeenCalled();
  });
});
