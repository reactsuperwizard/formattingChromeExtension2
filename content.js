/*chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.data != undefined) {
    chrome.runtime.sendMessage({
      'curContent': document.getElementsByClassName('formulaEditorText')[0].value
    });
  }
  if (msg.plainText != undefined) {
    var originTd = document.getElementsByClassName('formulaEditorExpressionCell')[0];
    var originElem = document.getElementsByClassName('formulaEditorText')[0];

    var newTd = document.getElementsByClassName('formulaEditorExpressionCell')[1];
    var newElem = document.getElementsByClassName('formulaEditorText')[1];

    originTd.style.display = "none";
    newTd.style.display = "block";
    newElem.value = originElem.value;
  }
})*/