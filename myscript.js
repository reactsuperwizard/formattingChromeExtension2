
$(document).ready(function(){
  $('.formulaEditorText').val('((((1+2)*3)*4)*5');
  /*$(document).on('change', '.formulaEditorText', function(){
    console.log($(this).val());
  });*/
  $('.formulaEditorText').after('<code id="formated_text" style="display:none;">This is formatted text</code>');
});

var colorList = [''];

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z_]/i);
}

function getIndicesOf(searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
      return [];
  }
  var startIndex = 0, index, indices = [];
  if (caseSensitive == false) {
      str = str.toLowerCase();
      searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchStrLen;
  }
  return indices;
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if ( request.action == 1 ) {
      // show formatted text
      var highlights = [];
      var srcStr = ' ' + $('.formulaEditorText').val(); // add space to first position
      var strLen = srcStr.length;
      var totalParDepth = 0;
      var parFuncDepth = 0;
      var braFuncDepth = 0;
      var i;

      // highest priority find single quote
      var sQuoteIndices = getIndicesOf("'", srcStr, true);
      var dQuoteIndices = getIndicesOf('"', srcStr, true);
      var sQuoteStarted = false;
      var dQuoteStarted = false;

      var quotePairArr = [];
      for ( i = 1; i < strLen; i++ ) {
        if ( !dQuoteStarted && sQuoteIndices.indexOf(i) >= 0 ) {
          quotePairArr.push(i);
          sQuoteStarted = !sQuoteStarted;
        } else if ( !sQuoteStarted && dQuoteIndices.indexOf(i) >= 0 ) {
          quotePairArr.push(i);
          dQuoteStarted = !dQuoteStarted;
        }
      }


      // find if position
      var ifIndices = getIndicesOf(' if ', srcStr, false);
      var thenIndices = getIndicesOf(' then ', srcStr, false);
      var elseIndices = getIndicesOf(' else ', srcStr, false);
      var thenStack = [];
      var curDepth = 0;
      var prevThenElse = '';

      console.log(ifIndices);
      console.log(thenIndices);
      console.log(elseIndices);

      for ( i = 0; i < strLen; i++ ) {
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
          if ( isLetter(srcStr[i-1]) ) {
            // if parenthesis open, but before letter is character then it is function
            parFuncDepth++;

            let subStr = srcStr.slice(0,i);
            let matches = subStr.match(/[^a-z_][a-z_]+/gi);
            let lastMatch = matches[matches.length-1];
            let pos = subStr.lastIndexOf(lastMatch);

            highlights[pos+1] = {type:"func", len:lastMatch.length-1};
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
          if ( isLetter(srcStr[i-1]) ) {
            let subStr = srcStr.slice(0,i);
            let matches = subStr.match(/[^a-z_][a-z_]+/gi);
            let lastMatch = matches[matches.length-1];
            let pos = subStr.lastIndexOf(lastMatch);

            highlights[pos+1] = {type:"brafunc", len:lastMatch.length-1};
            highlights[i] = {depth:braFuncDepth, type:"braopen", len:1};
            braFuncDepth++;
          }
        } else if ( srcStr[i] == ']' ) {
          highlights[i] = {depth:braFuncDepth, type:"braclose", len:1};
          braFuncDepth--;
        } else if ( ifIndices.indexOf(i) >= 0 ) {
          highlights[i+1] = {type:"ite", len:2, depth:curDepth};
          highlights[i+3] = {type:"indentStart", count:1};

        } else if ( thenIndices.indexOf(i) >= 0 ) {
          highlights[i] = {type:"indentEnd", count:1}; // add indent end tag for if
          highlights[i+1] = {type:"ite", len:4 ,depth:curDepth}; // add highlight for then
          highlights[i+5] = {type:"indentStart", count:1}; // add indent open tag for then
          prevThenElse = 'then';
          curDepth++; // curDepth increase
          thenStack.push(curDepth); // add current depth to thenStack
        } else if ( elseIndices.indexOf(i) >= 0 ) {
          if ( thenStack.length > 0 ) { // validation
            let thenDepth = thenStack.pop(); // pop last then from thenStack
            if ( prevThenElse == 'else' ) {
              highlights[i] = {type:"indentEnd", count:curDepth - thenDepth}; // add indent end tag as much as indent different
              curDepth = thenDepth;
            } else {
              highlights[i] = {type:"indentEnd", count:1}; // add indent end tag as much as indent different
            }
            console.log("else " + highlights[i].count);

            highlights[i+1] = {type:"ite", len:4 ,depth:curDepth}; // add highlight for then
            highlights[i+5] = {type:"indentStart", count:1}; // add indent start tag for else
            prevThenElse = 'else';
          }
        }
      }

      console.log(highlights);

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
          classStr += ' rsm-bracket-' + (curDepth < 0 ? 'wrong' : curDepth);
        } else if ( curType == "ite") {
          var curDepth = curHighLights.depth;
          classStr += ' rsm-ite-' + (curDepth < 0 ? 'wrong' : curDepth);
        } else {
          classStr += ' rsm-' + curType;
        }

        if (curType == "indentStart") {
          destStr = [destStr.slice(0, curPos), '<span class="' + classStr + '">'.repeat(curHighLights.count), destStr.slice(curPos)].join('');
        } else if (curType == "indentEnd") {
          destStr = [destStr.slice(0, curPos), '</span>'.repeat(curHighLights.count), destStr.slice(curPos,curPos)].join('');
        } else {
          destStr = [destStr.slice(0, curPos), '<span class="' + classStr + '">', destStr.slice(curPos,curPos+curLen), '</span>', destStr.slice(curPos+curLen)].join('');
        }
      }

      $('#formated_text').html(destStr);
      $('#formated_text').show();
      $('.formulaEditorText').hide();
    } else {
      // hide formatted text
      $('#formated_text').hide();
      $('.formulaEditorText').show();
    }
  } 
);
