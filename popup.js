function action() {
  var elem = document.getElementById("apply_drop");
  var curStatus = 0;
  if (elem.innerHTML == "Apply") {
    elem.innerHTML = "Drop";
    curStatus = 1;
  } else {
    elem.innerHTML = "Apply";
  }

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: curStatus
      });
  });

}

window.addEventListener('load', function () {
  document.getElementById('apply_drop').addEventListener('click', action);
}, false);
