function rsm_action() {
  var elem = document.getElementById("apply-indent");
  var action = elem.checked ? 'apply-indent':'disable-indent';

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action
      });
  });

}

window.addEventListener('load', function () {
  document.getElementById('apply-indent').addEventListener('change', rsm_action);
}, false);
