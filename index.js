"use strict";

/** {Array<EventRecord>} 用來放 EventRecord，最後所有日曆事件資料都在此陣列內 */
let eventRecords = [];

/** 網頁右邊印出前 N 個日曆事件 */
const MAX_SHOW_RECORD = 10;

const KEY_WORDS = {
  /** 從 ICS 檔案內要讀取的欄位開頭字串 */
  WORDS: ['BEGIN:VEVENT', 'DTSTART', 'DTEND', 'DESCRIPTION', 'SUMMARY', 'END:VEVENT'],
  /** 對應上述開頭字串，此為「該欄位要從第幾個字元開始往後切 substring」 */
  SUBSTRING: [0, 8, 6, 12, 8, 0]
};

/** EventRecord 物件用來放單一日曆事件 */
class EventRecord {
  constructor(start, end, title, more) {
    this.start = start.trim();
    this.end = end.trim();
    /** {string} 因 csv 以半形逗號作為欄位區隔，需將日曆中的半形逗號都以全形逗號取代。 */
    this.title = title.trim().replace(/\\,/g, '，');
    this.more = more.trim().replace(/\\,/g, '，');
  }
}


$(function() {
  $('#input_file').change(function(e) {
    $('#div_download').empty();
    $('#div_result_file_name').empty();
    $('#div_result_table').empty();

    const INPUT_FILE = e.target.files[0];
    if (INPUT_FILE === null) {
      return;
    }
    $('#div_result_file_name').append('檔案名稱：' + INPUT_FILE.name + '<hr/>');

    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parse(fileReader.result.split('\n'));
      sortResult();
      printResult();
      createDownloadableContent();
    };
  });
});


/**
 * 將讀入之 ICS 檔案解析，與 KEY_WORDS 比較是否為我們感興趣之欄位，將其放在暫存之欄位陣列內。
 * @param  {Array<string>} input [讀入之字串陣列]
 */
function parse(input) {
  let _keywordIndex = 0;
  let tempArray = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i].match('^' + KEY_WORDS.WORDS[_keywordIndex])) {
      tempArray[_keywordIndex] = input[i].substring(KEY_WORDS.SUBSTRING[_keywordIndex]);
      _keywordIndex++;

      if (_keywordIndex === KEY_WORDS.WORDS.length) {
        handleEventRecord(tempArray);
        _keywordIndex = 0;
        tempArray = [];
      }
    }
  }
}

/**
 * 將暫存之欄位陣列再次做檢查後，存入最終的 eventRecords 陣列中。
 * @param  {Array<string>} arr [暫存之欄位陣列]
 */
function handleEventRecord(arr) {
  /** 若某日曆事件是「全天」事件，則其時間格式與「幾點到幾點」不一樣，需要再往後多切一點 */
  if (arr[1].match('^VALUE')) {
    arr[1] = arr[1].substring(11);
  }
  if (arr[2].match('^VALUE')) {
    arr[2] = arr[2].substring(11);
  }
  eventRecords.push(new EventRecord(arr[1], arr[2], arr[4], arr[3]));
}


function sortResult() {
  eventRecords.sort(function(a, b) {
    return a.start.substr(0, 8) - b.start.substr(0, 8);
  });
}

function printResult() {
  let str = '';
  str += '<table id="table_result" class="table table-condensed table-bordered table-stripped"><tr>';
  str += '<th>#</th>';
  str += '<th>開始</th>';
  str += '<th>結束</th>';
  str += '<th>標題</th>';
  str += '<th>詳細</th>';
  str += '</tr></table>';
  $("#div_result_table").append(str);

  const _printLength = eventRecords.length > MAX_SHOW_RECORD ? MAX_SHOW_RECORD : eventRecords.length;
  for (let i = 0; i < _printLength; i++) {
    let str = '';
    str += '<tr>';
    str += '<td>' + i + '</td>';
    str += '<td>' + eventRecords[i].start + '</td>';
    str += '<td>' + eventRecords[i].end + '</td>';
    str += '<td>' + eventRecords[i].title + '</td>';
    str += '<td>' + eventRecords[i].more + '</td>';
    str += '</tr>';
    $("#table_result").append(str);
  }
}


function createDownloadableContent() {
  let content = '#,開始,結束,標題,詳細\n';
  for (let i = 0; i < eventRecords.length; i++) {
    content += i + 1 + ',';
    content += eventRecords[i].start + ',';
    content += eventRecords[i].end + ',';
    content += eventRecords[i].title + ',';
    content += eventRecords[i].more + ',';
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


//////////////////////
// Helper Functions //
//////////////////////

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
