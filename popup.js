function rsm_save_options() {
  var color = document.getElementById('apply-color').checked;
  var indent = document.getElementById('apply-indent').checked;
  var tooltip = document.getElementById('apply-tooltip').checked;
  var grid = document.getElementById('apply-grid').checked;
  var link = document.getElementById('disable-link').checked;
  chrome.storage.local.set({
    rsmColor: color,
    rsmIndent: indent,
    rsmTooltip: tooltip,
    rsmGrid: grid,
    rsmLink: link,
  }, function() {
    //
  });
}

function rsm_restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    rsmColor: false,
    rsmIndent: false,
    rsmTooltip: false,
    rsmGrid: false,
    rsmLink: false,
  }, function(items) {
    document.getElementById('apply-color').checked = items.rsmColor;
    document.getElementById('apply-indent').checked = items.rsmIndent;
    document.getElementById('apply-tooltip').checked = items.rsmTooltip;
    document.getElementById('apply-grid').checked = items.rsmGrid;
    document.getElementById('disable-link').checked = items.rsmLink;
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
  var elem = document.getElementById("apply-color");
  var action = elem.checked ? 'apply-color':'disable-color';

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

function rsm_link_change() {
  var elem = document.getElementById("disable-link");
  var action = elem.checked ? 'disable-link':'apply-link';

  rsm_handle_action(action);
}

document.addEventListener('DOMContentLoaded', function(){
  rsm_restore_options();
  document.getElementById('apply-color').addEventListener('change', rsm_color_change);
  document.getElementById('apply-indent').addEventListener('change', rsm_indent_change);
  document.getElementById('apply-tooltip').addEventListener('change', rsm_tooltip_change);
  document.getElementById('apply-grid').addEventListener('change', rsm_grid_change);
  document.getElementById('disable-link').addEventListener('change', rsm_link_change);
});
