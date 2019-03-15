function rsm_save_options() {
  var color = document.getElementById('apply-color').innerHTML;
  var indent = document.getElementById('apply-indent').checked;
  chrome.storage.local.set({
    rsmColor: color,
    rsmIndent: indent
  }, function() {
    //
  });
}

function rsm_restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    rsmColor: 'APPLY',
    rsmIndent: false
  }, function(items) {
    document.getElementById('apply-color').innerHTML = items.rsmColor;
    document.getElementById('apply-indent').checked = items.rsmIndent;
  });
}

function rsm_color_change() {
  var action = false;
  var elem = document.getElementById("apply-color");
  if (elem.innerHTML == "APPLY") {
    elem.innerHTML = "CANCEL";
    action = 'apply-color';
  } else {
    elem.innerHTML = "APPLY";
    action = 'disable-color';
  }

  rsm_save_options();

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action
      });
  });
}

function rsm_indent_change() {
  var elem = document.getElementById("apply-indent");
  var action = elem.checked ? 'apply-indent':'disable-indent';

  rsm_save_options();

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action
      });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  rsm_restore_options();
  console.log('in')
  document.getElementById('apply-color').addEventListener('click', rsm_color_change);
  document.getElementById('apply-indent').addEventListener('change', rsm_indent_change);
});
