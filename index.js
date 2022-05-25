'use strict';

const fileStorage = require('./json-storage/fileStorage');

let config = {};


function fileHandler(req, res, next) {
  switch (req.method) {
    case 'GET':
      return fileStorage.handleGET(req, res, config);
    case 'PUT':
    case 'POST':
      return fileStorage.handlePOST(req, res, config);
  }
}

function jsonFileStorage(conf) {

  let c = {};
  for (let i in conf) {
    c[conf[i].path] = conf[i];
  }
  config = c;

  return fileHandler;
}

module.exports = {
  jsonFileStorage: jsonFileStorage
};