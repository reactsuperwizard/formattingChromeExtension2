var gRsmColor = 'APPLY';
var gRsmIndent = false;

function rsmIsLetter(str) {
  return str != undefined && str.length === 1 && str.match(/[a-z_]/i);
}

function rsmGetIndicesOf(searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
      return [];
  }
  var startIndex = 0, index, indices = [];
  if (!caseSensitive) {
      str = str.toLowerCase();
      searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchStrLen;
  }
  return indices;
}

function rsmGetSelectionCharacterOffsetWithin(element) {
  var start = 0;
  var end = 0;
  var doc = element.ownerDocument || element.document;
  var win = doc.defaultView || doc.parentWindow;
  var sel;
  if (typeof win.getSelection != "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      var range = win.getSelection().getRangeAt(0);
      var preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      start = preCaretRange.toString().length;
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      end = preCaretRange.toString().length;
    }
  } else if ( (sel = doc.selection) && sel.type != "Control") {
    var textRange = sel.createRange();
    var preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToStart", textRange);
    start = preCaretTextRange.text.length;
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    end = preCaretTextRange.text.length;
  }
  return { start: start, end: end };
}

function rsmGetTextNodesIn(node) {
  var textNodes = [];
  if (node.nodeType == 3) {
    textNodes.push(node);
  } else {
    var children = node.childNodes;
    for (var i = 0, len = children.length; i < len; ++i) {
      textNodes.push.apply(textNodes, rsmGetTextNodesIn(children[i]));
    }
  }
  return textNodes;
}

function rsmSetSelectionRange(el, start, end) {
  if (document.createRange && window.getSelection) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var textNodes = rsmGetTextNodesIn(el);
    var foundStart = false;
    var charCount = 0, endCharCount;

    for (var i = 0, textNode; textNode = textNodes[i++]; ) {
      endCharCount = charCount + textNode.length;
      if (!foundStart && start >= charCount
          && (start < endCharCount ||
          (start == endCharCount && i <= textNodes.length))) {
        range.setStart(textNode, start - charCount);
        foundStart = true;
      }
      if (foundStart && end <= endCharCount) {
        range.setEnd(textNode, end - charCount);
        break;
      }
      charCount = endCharCount;
    }

    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (document.selection && document.body.createTextRange) {
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(el);
    textRange.collapse(true);
    textRange.moveEnd("character", end);
    textRange.moveStart("character", start);
    textRange.select();
  }
}

function rsmFormatText(srcStr) {
  var srcStrLen = srcStr.length;

  // highest priority find single quote
  var sQuoteIndices = rsmGetIndicesOf("'", srcStr, true);
  var dQuoteIndices = rsmGetIndicesOf('"', srcStr, true);
  var sQuoteStarted = false;
  var dQuoteStarted = false;

  var i;
  var quotePairArr = [];
  for ( i = 0; i < srcStrLen; i++ ) {
    if ( !dQuoteStarted && sQuoteIndices.indexOf(i) >= 0 ) {
      quotePairArr.push(i);
      sQuoteStarted = !sQuoteStarted;
    } else if ( !sQuoteStarted && dQuoteIndices.indexOf(i) >= 0 ) {
      quotePairArr.push(i);
      dQuoteStarted = !dQuoteStarted;
    }
  }

  // find if position
  var ifIndices = rsmGetIndicesOf("if", srcStr, false);
  var thenIndices = rsmGetIndicesOf("then", srcStr, false);
  var elseIndices = rsmGetIndicesOf("else", srcStr, false);

  var highlights = [];
  var totalParDepth = 0;
  var parFuncDepth = 0;
  var braFuncDepth = 0;
  var curIteDepth = 0;
  var thenStack = [];

  for ( i = 0; i < srcStrLen; i++ ) {
    let quoteOrder = quotePairArr.indexOf(i);
    if ( quoteOrder >= 0 ) {
      if ( quoteOrder < quotePairArr.length ) {
        // if it's not last quote then skip
        i = quotePairArr[quoteOrder + 1];
        continue;
      } else {
        // if last quote then break
        break;
      }
    } else if ( srcStr[i] == '(' ) {
      if ( i > 0 && rsmIsLetter(srcStr[i-1]) ) {
        // if parenthesis open, but before letter is character then it is function
        parFuncDepth++;

        let subStr = srcStr.slice(0,i);
        let matches = subStr.match(/[a-z_]+/gi);
        let lastMatch = matches[matches.length-1];
        let pos = subStr.lastIndexOf(lastMatch);

        highlights[pos] = {type:"func", len:lastMatch.length};
      }

      highlights[i] = {depth:totalParDepth, type:"open", len:1};
      totalParDepth++;
    } else if ( srcStr[i] == ')' ) {
      if (parFuncDepth > 0) {
        parFuncDepth--;
      }

      totalParDepth--;
      highlights[i] = {depth:totalParDepth, type:"close", len:1};
    } else if ( srcStr[i] == '[' ) {
      if ( i > 0 && rsmIsLetter(srcStr[i-1]) ) {
        let subStr = srcStr.slice(0,i);
        let matches = subStr.match(/[a-z_]+/gi);
        let lastMatch = matches[matches.length-1];
        let pos = subStr.lastIndexOf(lastMatch);

        highlights[pos] = {type:"brafunc", len:lastMatch.length};
        highlights[i] = {depth:braFuncDepth, type:"braopen", len:1};
        braFuncDepth++;
      }
    } else if ( srcStr[i] == ']' ) {
      highlights[i] = {depth:braFuncDepth, type:"braclose", len:1};
      braFuncDepth--;
    } else if ( ifIndices.indexOf(i) >= 0 ) {
      let charLen = 2;
      if (i == 0 || i == srcStrLen-charLen || (!rsmIsLetter(srcStr[i-1]) && !rsmIsLetter(srcStr[i+charLen]) )) {
        highlights[i] = {type:"ite", len:charLen+1, depth:curIteDepth};
        highlights[i+charLen-1] = {type:"indentStart", count:1};
      }

      i += charLen; // for perfomance skip next charLen characters
    } else if ( thenIndices.indexOf(i) >= 0 ) {
      let charLen = 4;
      if (i == 0 || i == srcStrLen-charLen || (!rsmIsLetter(srcStr[i-1]) && !rsmIsLetter(srcStr[i+charLen]) )) {
        highlights[i-1] = {type:"indentEnd", count:1}; // add indent end tag for if
        highlights[i] = {type:"ite", len:charLen+1, depth:curIteDepth}; // add highlight for then
        highlights[i+charLen-1] = {type:"indentStart", count:1}; // add indent open tag for then
        curIteDepth++; // curIteDepth increase
        thenStack.push(curIteDepth); // add current depth to thenStack
      }

      i += charLen; // for perfomance skip next charLen characters
    } else if ( elseIndices.indexOf(i) >= 0 ) {
      let charLen = 4;
      if (i == 0 || i == srcStrLen-charLen || (!rsmIsLetter(srcStr[i-1]) && !rsmIsLetter(srcStr[i+charLen]) )) {
        if ( thenStack.length > 0 ) { // validation
          let thenDepth = thenStack.pop(); // pop last then from thenStack
          highlights[i-1] = {type:"indentEnd", count:curIteDepth - thenDepth + 1}; // add indent end tag as much as indent different
          curIteDepth = thenDepth;

          highlights[i] = {type:"ite", len:charLen+1, depth:curIteDepth-1}; // add highlight for then
          highlights[i+charLen-1] = {type:"indentStart", count:1}; // add indent start tag for else
        }
      }
      i += charLen; // for perfomance skip next charLen characters
    }
  }

  // array key reverse
  var keys = new Array();
  for (var k in highlights) {
      keys.unshift(k);
  }

  var destStr = srcStr;
  for (var c = keys.length, n = 0; n < c; n++) {
    var curPos = parseInt(keys[n]);
    var curHighLights = highlights[curPos];
    var curType = curHighLights.type;
    var curLen = curHighLights.len;
    var classStr = 'rsm-highlight';

    if ( curType == "open" || curType == "close" ) {
      var curDepth = curHighLights.depth;
      if ( totalParDepth > 0 ) curDepth -= totalParDepth;
      classStr += ' rsm-bracket rsm-bracket-' + (curDepth < 0 ? 'wrong' : curDepth);
    } else if ( curType == "ite") {
      var curDepth = curHighLights.depth;
      classStr += ' rsm-ite rsm-ite-' + (curDepth < 0 ? 'wrong' : curDepth);
    } else {
      classStr += ' rsm-' + curType;
    }

    if (curType == "indentStart") {
      destStr = [destStr.slice(0, curPos+2), '<span class="' + classStr + '">'.repeat(curHighLights.count), destStr.slice(curPos+2)].join('');
    } else if (curType == "indentEnd") {
      destStr = [destStr.slice(0, curPos+1), '</span>'.repeat(curHighLights.count), destStr.slice(curPos+1)].join('');
    } else {
      destStr = [destStr.slice(0, curPos), '<span class="' + classStr + '">', destStr.slice(curPos,curPos+curLen), '</span>', destStr.slice(curPos+curLen)].join('');
    }
  }

  return destStr;
};

function rsmUpdateFormatting(srcStr) {
  srcStr = srcStr.trimRight() + ' ';
  let destStr = rsmFormatText(srcStr);

  $('#formated_text').html(destStr);
  $('.formulaEditorText').val($('#formated_text').text());
}

// create elements and add trigger
function rsmInitElement() {
  $('.formulaEditorText').before('<code id="formated_text" style="" contenteditable="true"></code>');
  $('.formulaEditorText').before("<style>.original .formulaEditorExpressionTable{table-layout: fixed;} #formated_text {font-size: 12px; min-width:40px; min-height:20px; display:block; width:100%; height:100%; box-sizing: border-box;border: 1px solid #ccc!important; padding: 9px; white-space: pre-wrap;} .rsm-highlight {font-weight: bold} .rsm-bracket-wrong {color: #f00;font-weight: 900;} .rsm-bracket-0 {color: green;} .rsm-bracket-1 {color: yellow;} .rsm-bracket-2 {color: brown;} .rsm-bracket-3 {color: magenta;} .rsm-bracket-4 {color: purple;} .rsm-ite-0 {color: #0070c0;} .rsm-ite-1 {color: #7030a0;} .rsm-ite-2 {color: #00B0F0;} .rsm-ite-3 {color: #0000ff;} .rsm-func {color: blue;} .rsm-brafunc {color: darkgreen;}</style>");
  $('.formulaEditorText').before("<style id='rsm-indentation-style' disabled>.rsm-ite {display: block;} .rsm-indentStart {display:block; margin-left: 30px;}</style>");
  document.getElementById("rsm-indentation-style").disabled = true;

  // init text
  rsmUpdateFormatting($('.formulaEditorText').val());

  document.getElementById("formated_text").addEventListener("input", function(evt) {
    if ( evt.inputType == "insertParagraph" ) {
      evt.preventDefault();
      evt.stopPropagation();
      // if enter key pressed
      // $('.formulaEditorText').val($('#formated_text').text());
      var e = $.Event('keypress', { keyCode: 13 });
      $('.formulaEditorText').trigger(e);
      return;
    }

    let srcStr = $('#formated_text').text();
    let el = $("#formated_text").get(0);
    let selection = rsmGetSelectionCharacterOffsetWithin(el);
    rsmUpdateFormatting(srcStr);
    rsmSetSelectionRange(el, selection.start, selection.start);
    
  }, false);
}

function rsmApplyColor(flag) {
  if (flag) {
    rsmUpdateFormatting($('.formulaEditorText').val());
    $('#formated_text').show();
    $('.formulaEditorText').hide();
  } else {
    $('.formulaEditorText').show();
    $('#formated_text').hide();
  }
}

function rsmApplyIndent(flag) {
  document.getElementById("rsm-indentation-style").disabled = !flag;
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {

    if ( $('.formulaEditorText').length == 0 ) return;
    if (!$('#formated_text').length) rsmInitElement();

    if ( request.action == 'apply-indent' ) {
      rsmApplyIndent(true);
    } else if ( request.action == 'disable-indent' ) {
      rsmApplyIndent(false);
    } else if ( request.action == 'apply-color' ) {
      rsmApplyColor(true);
    } else if ( request.action == 'disable-color' ) {
      rsmApplyColor(false);
    }
  } 
);

chrome.storage.local.get({
    rsmColor: 'APPLY',
    rsmIndent: false
  }, function(items) {
  gRsmColor = items.rsmColor;
  gRsmIndent = items.rsmIndent;
});



$('body').click(function(){
  if ( $('.formulaEditorText').length == 0 ) return;

  // if current setting and chrome setting is different then force update
  if ( !$('#formated_text').length && gRsmColor != 'APPLY' ) {
    rsmInitElement();
    if ( gRsmColor != 'APPLY' ) {
      rsmApplyColor(true);
    }

    // if current setting and chrome setting is different then force update
    if ( gRsmIndent ) {
        rsmApplyIndent(true);
    }
  }
});

