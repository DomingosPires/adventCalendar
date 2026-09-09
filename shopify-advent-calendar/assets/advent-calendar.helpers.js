(function (root) {
  function parseDayParam(search) {
    var raw = new URLSearchParams(search || '').get('day');
    if (raw === null) return null;
    var v = Number(raw);
    return Number.isInteger(v) && v >= 1 && v <= 25 ? v : null;
  }

  function readOpened(storage, key) {
    var raw;
    try { raw = storage.getItem(key); } catch (e) { return new Set(); }
    if (!raw) return new Set();
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(function (n) { return typeof n === 'number'; }));
      }
    } catch (e) { /* malformed */ }
    return new Set();
  }

  function writeOpened(storage, key, set) {
    try { storage.setItem(key, JSON.stringify([].concat(Array.from(set)))); } catch (e) { /* ignore */ }
  }

  function parseArea(str) {
    var p = String(str).split('/').map(function (s) { return s.trim(); });
    function span(s) {
      var m = /span\s+(\d+)/.exec(s || '');
      return m ? Number(m[1]) : (Number(s) || 1);
    }
    return { row: Number(p[0]) || 1, col: Number(p[1]) || 1, rowSpan: span(p[2]), colSpan: span(p[3]) };
  }

  function buildCoverage(areas, cols, rows) {
    var claims = {};
    areas.forEach(function (item) {
      var a = parseArea(item.area);
      for (var r = a.row; r < a.row + a.rowSpan; r++) {
        for (var c = a.col; c < a.col + a.colSpan; c++) {
          var k = r + ',' + c;
          (claims[k] = claims[k] || []).push(item.day);
        }
      }
    });
    var empties = [];
    var covered = 0;
    for (var r = 1; r <= rows; r++) {
      for (var c = 1; c <= cols; c++) {
        var k = r + ',' + c;
        if (claims[k] && claims[k].length) covered++;
        else empties.push(k);
      }
    }
    var overlaps = Object.keys(claims)
      .filter(function (k) { return claims[k].length > 1; })
      .map(function (k) { return { cell: k, days: claims[k].slice() }; });
    return { covered: covered, total: cols * rows, empties: empties, overlaps: overlaps };
  }

  var api = { parseDayParam: parseDayParam, readOpened: readOpened, writeOpened: writeOpened, parseArea: parseArea, buildCoverage: buildCoverage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AdventHelpers = api;
})(typeof window !== 'undefined' ? window : null);
