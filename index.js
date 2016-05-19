"use strict";

/** {Array<EventRecord>} 用來放 EventRecord，最後所有日曆事件資料都在此陣列內 */
let eventRecords = [];

const _NULL = '-';

const KEY_WORDS = {
  /** 從 ICS 檔案內要讀取的欄位開頭字串 */
  WORDS: ['BEGIN:VEVENT', 'DTSTART', 'SUMMARY', 'END:VEVENT'],
  /** 對應上述開頭字串，此為「該欄位要從第幾個字元開始往後切 substring」 */
  SUBSTRING: [0, 19, 8, 0]
};

/** EventRecord 物件用來放單一日曆事件 */
class EventRecord {
  constructor(date, summary) {
    this.date = date.trim();
    /** {string} 因 csv 以半形逗號作為欄位區隔，需將日曆中的半形逗號都以全形逗號取代。 */
    /** 這邊 parse 的格式： [分數] 事件@人物#標籤 */
    summary = summary.trim().replace(/\\,/g, '，');
    // 取得 [分數]
    if (summary.charAt(1).match(/[1-5]/)) {
      this.score = summary[1];
    } else {
      this.score = _NULL;
    }
    let tmp = summary.substring(4);
    // 取得#標籤
    tmp = tmp.split('#');
    if (tmp.length === 1) {
      this.tags = _NULL;
    } else {
      // 將 #多個#連在一起的#標籤 切割成 [多個, 連在一起的, 標籤] 陣列
      this.tags = [];
      for (let i = 1; i < tmp.length; i++) {
        this.tags.push(tmp[i].trim());
      }
    }
    // 取得@人物
    tmp = tmp[0].split('@');
    if (tmp.length === 1) {
      this.friends = _NULL;
    } else {
      // 將 @多個@連在一起的@人物 切割成 [多個, 連在一起的, 人物] 陣列
      this.friends = [];
      for (let i = 1; i < tmp.length; i++) {
        this.friends.push(tmp[i].trim());
      }
    }
    // 取得事件
    this.story = tmp[0].trim();
  }
}


$(function() {
  $('#panel_check_boxes').hide();

  $('#input_file').change(function(e) {
    $('#div_download').empty();

    const INPUT_FILE = e.target.files[0];
    if (INPUT_FILE === null) {
      return;
    }

    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parseInputFile(fileReader.result.split('\n'));
      sortEventRecords();
      printResults();
      createDownloadableContent();
    };
  });
});


/**
 * 將讀入之 ICS 檔案解析，與 KEY_WORDS 比較是否為我們感興趣之欄位，將其放在暫存之欄位陣列內。
 * @param  {Array<string>} input [讀入之字串陣列]
 */
function parseInputFile(input) {
  let _keywordIndex = 0;
  let tempArray = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i].match('^' + KEY_WORDS.WORDS[_keywordIndex])) {
      tempArray[_keywordIndex] = input[i].substring(KEY_WORDS.SUBSTRING[_keywordIndex]);
      _keywordIndex++;

      if (_keywordIndex === KEY_WORDS.WORDS.length) {
        eventRecords.push(new EventRecord(tempArray[1], tempArray[2]));
        _keywordIndex = 0;
        tempArray = [];
      }
    }
  }
}

function sortEventRecords() {
  eventRecords.sort(function(a, b) {
    return a.date.substr(0, 8) - b.date.substr(0, 8);
  });
}


function createDownloadableContent() {
  const canJoin = function(elements) {
    if (elements === _NULL) {
      return _NULL;
    }
    return elements.join('-');
  };
  let content = '#,日期,分數,標籤,人物,事件\n';
  for (let i = 0; i < eventRecords.length; i++) {
    const e = eventRecords[i];
    content += i + 1 + ',';
    content += String(e.date.slice(0, 4) + "/" + e.date.slice(4, 6) + "/" + e.date.slice(6)) + ',';
    content += e.score + ',';
    content += canJoin(e.tags) + ',';
    content += canJoin(e.friends) + ',';
    content += e.story + ',';
    content += "\n";
  }

  const fileName = 'Google_calendar' + getDateTime() + '.csv';
  const buttonDownload = '<a ' +
    'id="button_download" ' +
    'class="btn btn-block btn-lg btn-success" ' +
    'href="' + getblobUrl(content) + '" ' +
    'download="' + fileName + '" ' +
    '>下載 CSV 檔</a>';
  $("#div_download").append(buttonDownload);
}


// /////////////////////////////
//  Download Helper Functions //
// /////////////////////////////

function getblobUrl(content) {
  const _MIME_TYPE = 'text/plain';
  const _UTF8_BOM = '\uFEFF';
  const blob = new Blob([_UTF8_BOM + content], {
    type: _MIME_TYPE
  });
  return window.URL.createObjectURL(blob);
}

function getDateTime() {
  // 如果現在時間是 2014/11/1, 21:07, 02 會得到 2014111_2172
  // 而我們想要的是 20141101_210702 才對
  const _DATE = new Date();
  const DATE_TIME = String(_DATE.getFullYear() + fixOneDigit((_DATE.getMonth() + 1)) + fixOneDigit(_DATE.getDate()) + "_" + fixOneDigit(_DATE.getHours()) + fixOneDigit(_DATE.getMinutes()) + fixOneDigit(_DATE.getSeconds()));
  return DATE_TIME;
}

function fixOneDigit(x) {
  return x < 10 ? ("0" + x) : x;
}



// ////////////////////
//   Print Results   //
// ////////////////////


function printResults() {
  const _SCORE_MSG = '分數';
  let str = '';
  str += '<table id="table_result" class="table table-condensed table-bordered table-striped table-hover"><tr>';
  str += '<th>#</th>';
  str += '<th>日期</th>';
  str += '<th>分數</th>';
  str += '<th>標籤</th>';
  str += '<th>人物</th>';
  str += '<th>事件</th>';
  str += '</tr></table>';
  $("#graph").append(str);

  // 將出現在日曆事件內的 @人物 與 #標籤 都儲存起來，作為顯示欄位的選項
  let _CB_SCORES = {1: 0, 2: 0, 3: 0};
  let _CB_FRIENDS = {};
  let _CB_TAGS = {};
  for (let i = 0; i < eventRecords.length; i++) {
    const e = eventRecords[i];
    let str = '';
    str += '<tr>';
    str += '<td>' + i + '</td>';
    str += '<td>' + String(e.date.slice(0, 4) + "/" + e.date.slice(4, 6) + "/" + e.date.slice(6)) + '</td>';
    str += '<td class="' + _SCORE_MSG + e.score + '">' + e.score + '</td>';
    _CB_SCORES = countElement(e.score, _CB_SCORES);
    str += getCustomizedTD(e.tags);
    _CB_TAGS = countElement(e.tags, _CB_TAGS);
    str += getCustomizedTD(e.friends);
    _CB_FRIENDS = countElement(e.friends, _CB_FRIENDS);
    str += '<td>' + e.story + '</td>';
    str += '</tr>';
    $("#table_result").append(str);
  }


  // 設定顯示欄位
  prepareSetCheckBoxes('li_checkbox_scores', _SCORE_MSG, false, _CB_SCORES);
  prepareSetCheckBoxes('li_checkbox_friends', '', true, _CB_FRIENDS);
  prepareSetCheckBoxes('li_checkbox_tags', '', true, _CB_TAGS);
  $('#panel_check_boxes').show();
  // 全部勾選按鈕
  $('#btn_check_all').click(function() {
    prepareCheckUncheckAll(_CB_SCORES, _SCORE_MSG, 'check');
    prepareCheckUncheckAll(_CB_FRIENDS, '', 'check');
    prepareCheckUncheckAll(_CB_TAGS, '', 'check');
  });
  // 全部取消按鈕
  $('#btn_uncheck_all').click(function() {
    prepareCheckUncheckAll(_CB_SCORES, _SCORE_MSG, 'uncheck');
    prepareCheckUncheckAll(_CB_FRIENDS, '', 'uncheck');
    prepareCheckUncheckAll(_CB_TAGS, '', 'uncheck');
  });
}


function prepareCheckUncheckAll(dict, prepend, flag) {
  for (const key in dict) {
    if ({}.hasOwnProperty.call(dict, key)) {
      setCheckUncheck(prepend + key, flag);
    }
  }
}
function setCheckUncheck(key, flag) {
  const CHECKBOX = '#panel_check_boxes #cb_' + key;
  const TD = '#table_result td.' + key;
  if (flag === 'check') {
    $(CHECKBOX).prop('checked', true);
    $(TD).parent().show();
  } else {
    $(CHECKBOX).prop('checked', false);
    $(TD).parent().hide();
  }
}


function prepareSetCheckBoxes(divID, prepend, sortFlag, dict) {
  // 由於 dictionary/hashMap/associateArray 無法排序，故先用可排序的 array 包起來
  let tmpArray = [];
  for (const key in dict) {
    if ({}.hasOwnProperty.call(dict, key)) {
      const value = dict[key];
      tmpArray.push({key: key, value: value});
    }
  }
  // 依照次數排序
  if (sortFlag === true) {
    tmpArray.sort(function(a, b) {
      return b.value - a.value;
    });
  }
  for (let i = 0; i < tmpArray.length; i++) {
    setCheckBoxes(divID, prepend + tmpArray[i].key, tmpArray[i].value);
  }
}
function setCheckBoxes(divID, key, value) {
  // 建立 DOM
  $('#' + divID).append('<label><input type="checkbox" checked="checked" ' +
      ' id="cb_' + key + '" > ' + key + '：' + value + '</label><br/>');
  // 綁定 DOM 的 EventListener
  $('#cb_' + key).click(function() {
    const CHECKBOX = '#panel_check_boxes #cb_' + key;
    const TD = '#table_result td.' + key;
    // 不能直接用 .toggle()，要考慮到同時擁有多個 class 的事件
    // $('#table_result td.score1').parent().toggle();
    if ($(CHECKBOX).prop('checked') === true) {
      $(TD).parent().show();
    } else {
      $(TD).parent().hide();
    }
  });
}
// TODO: 下面兩者應該可用 Function Programmming 的方式 refactor
function countElement(elements, CB_DICT) {
  if (elements !== _NULL) {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i] in CB_DICT) {
        CB_DICT[elements[i]]++;
      } else {
        CB_DICT[elements[i]] = 1;
      }
    }
  }
  return CB_DICT;
}
function getCustomizedTD(elements) {
  if (elements === _NULL) {
    return '<td>' + _NULL + '</td>';
  }
  return '<td class="' + elements.join(' ') + '">' + elements.join(',') + '</td>';
}
