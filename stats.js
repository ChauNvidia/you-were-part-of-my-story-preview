(function () {
  var NS = 'sen-ywpoms-7f3a', BASE = 'https://abacus.jasoncameron.dev/get/';
  var ROWS = [
    ['visits', 'Visits', 'People who opened the page (once per visit)'],
    ['started', 'Cards started', 'Picked who to thank'],
    ['copied', 'Cards copied', 'Copied the message and link'],
    ['shared', 'Cards shared', 'Used the Share button'],
    ['saved', 'Saved as a picture', 'Downloaded the card image'],
    ['opened', 'Opened by the person thanked', 'Someone opened a card link they received']
  ];
  var grid = document.getElementById('grid');
  function get(k) { return fetch(BASE + NS + '/' + k).then(function (r) { return r.ok ? r.json() : { value: 0 }; }).then(function (j) { return Number(j.value) || 0; }).catch(function () { return null; }); }
  Promise.all(ROWS.map(function (r) { return get(r[0]); })).then(function (v) {
    var out = {}; ROWS.forEach(function (r, i) { out[r[0]] = v[i]; });
    var sent = (out.copied || 0) + (out.shared || 0);
    var html = '<div class="tile big"><b>' + sent + '</b><span>Cards sent (estimate)</span><small>Copied plus shared</small></div>';
    ROWS.forEach(function (r, i) { html += '<div class="tile"><b>' + (v[i] === null ? '—' : v[i]) + '</b><span>' + r[1] + '</span><small>' + r[2] + '</small></div>'; });
    grid.innerHTML = html;
    document.getElementById('when').textContent = 'Updated ' + new Date().toLocaleString();
  });
})();
