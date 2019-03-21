function rsm_save_options() {
  var color = document.getElementById('apply-color').innerHTML;
  var indent = document.getElementById('apply-indent').checked;
  var tooltip = document.getElementById('apply-tooltip').checked;
  var grid = document.getElementById('apply-grid').checked;
  chrome.storage.local.set({
    rsmColor: color,
    rsmIndent: indent,
    rsmTooltip: tooltip,
    rsmGrid: grid
  }, function() {
    //
  });
}

function rsm_restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    rsmColor: 'ENABLE',
    rsmIndent: false,
    rsmTooltip: false,
    rsmGrid: false,
  }, function(items) {
    document.getElementById('apply-color').innerHTML = items.rsmColor;
    document.getElementById('apply-indent').checked = items.rsmIndent;
    document.getElementById('apply-tooltip').checked = items.rsmTooltip;
    document.getElementById('apply-grid').checked = items.rsmGrid;
  });
}

function rsm_handle_action(action) {
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

function rsm_color_change() {
  var action = false;
  var elem = document.getElementById("apply-color");
  if (elem.innerHTML == "ENABLE") {
    elem.innerHTML = "DISABLE";
    action = 'apply-color';
  } else {
    elem.innerHTML = "ENABLE";
    action = 'disable-color';
  }

  rsm_handle_action(action);
}

function rsm_indent_change() {
  var elem = document.getElementById("apply-indent");
  var action = elem.checked ? 'apply-indent':'disable-indent';

  rsm_handle_action(action);
}

function rsm_tooltip_change() {
  var elem = document.getElementById("apply-tooltip");
  var action = elem.checked ? 'apply-tooltip':'disable-tooltip';

  rsm_handle_action(action);
}

function rsm_grid_change() {
  var elem = document.getElementById("apply-grid");
  var action = elem.checked ? 'apply-grid':'disable-grid';

  rsm_handle_action(action);
}

document.addEventListener('DOMContentLoaded', function(){
  rsm_restore_options();
  document.getElementById('apply-color').addEventListener('click', rsm_color_change);
  document.getElementById('apply-indent').addEventListener('change', rsm_indent_change);
  document.getElementById('apply-tooltip').addEventListener('change', rsm_tooltip_change);
  document.getElementById('apply-grid').addEventListener('change', rsm_grid_change);
});
