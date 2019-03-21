var gRsmCurrentColor = 'APPLY';
var gRsmCurrentIndent = false;
var gRsmCurrentTooltip = false;
var gPrevValue = '';

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
      if ( i > 0 && rsmIsLetter(srcStr[i+1]) ) {
        /*let subStr = srcStr.slice(i);
        let matches = subStr.match(/\[[a-z_]+:/gi);

        if ( matches != null && matches.length > 0 ) {
          let braMatch = matches[0];
          highlights[i+1] = {type:"brafunc", len:braMatch.length-2};
        }*/

        highlights[i] = {depth:braFuncDepth, type:"braopen", len:1};
        highlights[i+1] = {type:"braContentStart", count:1};
        braFuncDepth++;
      }
    } else if ( srcStr[i] == ']' ) {
      highlights[i-1] = {type:"braContentEnd", count:1};
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
    } else if ( curType == "braContentStart") {
      destStr = [destStr.slice(0, curPos), '<span class="' + classStr + '">'.repeat(curHighLights.count), destStr.slice(curPos)].join('');
    } else if ( curType == "braContentEnd") {
      destStr = [destStr.slice(0, curPos+1), '</span>'.repeat(curHighLights.count), destStr.slice(curPos+1)].join('');
    } else {
      destStr = [destStr.slice(0, curPos), '<span class="' + classStr + '">', destStr.slice(curPos,curPos+curLen), '</span>', destStr.slice(curPos+curLen)].join('');
    }
  }

  return destStr;
};


// The dollar sign will equal jQuery in this scope
function rsmUpdateFormatting(srcStr) {
  srcStr = srcStr.trimRight() + ' ';
  let destStr = rsmFormatText(srcStr);

  $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').html(destStr);
  $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val($('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').text().trim());
}

// create elements and add trigger
function rsmInitElement() {
  $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').before('<code class="formated_text" style="" contenteditable="true"></code>');
  $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').before("<style id='rsm-main-style'>" + 
    ".original .formulaEditorExpressionTable{table-layout: fixed;}" +
    " .dijitTabContainerTopChildWrapper.dijitVisible .formated_text {overflow: scroll;display:none; font-size: 12px; min-width:40px; min-height:20px; display:block; width:100%; height:100%; box-sizing: border-box;border: 1px solid #ccc!important; padding: 9px; white-space: pre-wrap;}" +
    " .rsm-bracket-wrong {color: #f00;} .rsm-bracket-0 {color: green;} .rsm-bracket-1 {color: grey;} .rsm-bracket-2 {color: brown;} .rsm-bracket-3 {color: magenta;} .rsm-bracket-4 {color: purple;}" +
    " .rsm-ite-0 {color: #0070c0;} .rsm-ite-1 {color: #7030a0;} .rsm-ite-2 {color: #00B0F0;} .rsm-ite-3 {color: #0000ff;} .rsm-func {color: blue;} .rsm-brafunc{color: darkgreen;} .rsm-brafunc, .rsm-bracket, .rsm-ite, .rsm-func, .rsm-braopen, .rsm-braclose{font-weight:bold;} .rsm-braContentStart{color: darkgreen;}</style>");
  $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').before("<style id='rsm-indentation-style' disabled>.rsm-ite {display: block;} .rsm-indentStart {display:block; margin-left: 30px;}</style>");
  document.getElementById("rsm-indentation-style").disabled = true;

  // init text
  // rsmUpdateFormatting($('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val());

  var el = $(".dijitTabContainerTopChildWrapper.dijitVisible .formated_text").get(0);
  el.addEventListener("input", function(e) {
    let selection = rsmGetSelectionCharacterOffsetWithin(el);
    rsmUpdateFormatting($('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').text());
    rsmSetSelectionRange(el, selection.start, selection.start);
  }, false);

  $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').keydown(function(e) {
    if (e.key === "Escape") {
      // rsmUpdateFormatting(gPrevValue);
      rsmUpdateFormatting($('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').attr('prev_value'));
      return false;
      // esc key
    } else if (e.keyCode == 13) {
      // enter key
      $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').hide();
      $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').show();
      return false;
    }
  });
}



function rsmApplyColor(flag) {
  if (flag) {
    rsmUpdateFormatting($('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val());
    $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').show();
    $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').hide();
  } else {
    $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').show();
    $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').hide();
  }
}

function rsmApplyIndent(flag) {
  document.getElementById("rsm-indentation-style").disabled = !flag;
}

$.fn.overflown=function(){
  var e=this[0];
  return e.scrollWidth>e.clientWidth;
}

function rsmApplyTooltip(flag) {
  console.log(flag);
  $('table.grid.qa-module td > div').each(function(e){
    if ( $(this).overflown() ) {
      if (flag) {
        $(this).attr('title', $(this).text());
      } else {
        $(this).attr('title', '');
      }
    }
  });
}

function rsmRefresh() {
  if ( $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').length == 0 ) return false;
  if ( !$('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').length ) {
    $('.dijitTabContainerTopChildWrapper.dijitVisible .formated_text').remove();
    $('#rsm-main-style').remove();
    $('#rsm-indentation-style').remove();
    rsmInitElement();
    return 1;
  }
  return 2;
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {

    if ( request.action == 'apply-indent' ) {
      gRsmCurrentIndent = true;
    } else if ( request.action == 'disable-indent' ) {
      gRsmCurrentIndent = false;
    } else if ( request.action == 'apply-color' ) {
      gRsmCurrentColor = 'CANCEL';
    } else if ( request.action == 'disable-color' ) {
      gRsmCurrentColor = 'APPLY';
    } else if ( request.action == 'apply-tooltip' ) {
      gRsmCurrentTooltip = true;
    } else if ( request.action == 'disable-tooltip' ) {
      gRsmCurrentTooltip = false;
    }

    if ( $('table.grid.qa-module').length > 0 ) {
      rsmApplyTooltip(gRsmCurrentTooltip);
    }

    if (rsmRefresh()) {
      rsmApplyColor(gRsmCurrentColor != 'APPLY');
      rsmApplyIndent(gRsmCurrentIndent);
    }
  } 
);

$('body').click(function(e){
  if ( $('table.grid.qa-module').length > 0 ) {
    setTimeout(function(){
      rsmApplyTooltip(gRsmCurrentTooltip);
    }, 100);
  }

  if($(e.target).closest('table.formulaEditorExpressionTable').length) return;
  setTimeout(function(){
    let retVal = rsmRefresh();
    if (retVal) {
      let curValue = $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val();
      if ( retVal == 2 && curValue == gPrevValue ) return; // if not updated

      gPrevValue = curValue;
      rsmApplyColor(gRsmCurrentColor != 'APPLY');
      rsmApplyIndent(gRsmCurrentIndent);
      $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').attr('prev_value', gPrevValue);
    };
  }, 100);
});

$(document).keydown(function(e) {
  var lrud_keys = [37,38,39,40];
  if (lrud_keys.indexOf(event.which) >= 0 && $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').length) {
    if($(e.target).closest('table.formulaEditorExpressionTable').length) return;
    setTimeout(function(){
      rsmUpdateFormatting($('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val());
      $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').attr('prev_value', $('.dijitTabContainerTopChildWrapper.dijitVisible .formulaEditorText').val());
    }, 100);
  }
});

chrome.storage.local.get({
    rsmColor: 'APPLY',
    rsmIndent: false
  }, function(items) {
  gRsmCurrentColor = items.rsmColor;
  gRsmCurrentIndent = items.rsmIndent;
  gRsmCurrentTooltip = items.rsmTooltip;
});
