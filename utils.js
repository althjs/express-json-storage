
const path = require('path'),
  fs = require('fs');

function successCallback(data) {
  let response = {
    code: 'SUCCESS',
    data: data
  };

  if (typeof data !== 'string' && data.length) {
    response.count = data.length;
  }

  return response;
}

function errorCallback(err) {
  return {
    code: 'FAIL',
    message: err
  };
}



let readFile = (targetFile) => {
  // console.log('@@ utils.readFile:', targetFile);
  let df = new Promise((resolve, reject) => {
    fs.readFile(targetFile, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  return df;
};

let writeFile = (targetFile, text) => {
  let df = new Promise((resolve, reject) => {
    if (!targetFile) {
      reject('저장할 파일 파라미터 누락');
      return;
    } else if (!text) {
      reject('저장할 내용 누락');
      return;
    }

    fs.writeFile(targetFile, text, { encoding: 'utf8' }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });

  });

  return df;
};



module.exports = {
  successCallback: successCallback,
  errorCallback: errorCallback,
  readFile: readFile,
  writeFile: writeFile
}

