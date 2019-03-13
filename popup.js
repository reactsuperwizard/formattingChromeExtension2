var apply_yn = false;
function rsm_action() {
  var elem = document.getElementById("apply-indent");
  apply_yn = !apply_yn;
  var action = apply_yn ? 'apply-indent':'disable-indent';
  elem.innerText = apply_yn ? "CANCEL" : "APPLY";

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
  document.getElementById('apply-indent').addEventListener('click', rsm_action);
}, false);
