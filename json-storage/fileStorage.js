'use strict';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const utils = require('../utils');
const ecb = utils.errorCallback;
const fs = require('fs');
const exec = require('child_process').exec;


function parsePath(path, confPath) {
  let params = {},
    u = path.split('/'),
    len = u.length;

  if (path !== confPath) {
    params['file'] = decodeURIComponent(u[len - 2]);
    params['id'] = decodeURIComponent(u[len - 1]);
  } else if (len === 2) {
    params['file'] = decodeURIComponent(u[len - 1]);
  }

  return params;
}

function parseConfig(req, config) {
  let params = {};
  let path = req._parsedUrl.pathname;
  let conf;
  for (let key in config) {
    if (path.indexOf(key) > 0) {
      conf = config[key];
      break;
    }
  }

  if (path && conf) {
    params = parsePath(path.substring(path.lastIndexOf(conf.path), path.length), conf.path);
    params.conf = conf;
  }

  return params;
}


function getImageFolder(filePath) {
  if (filePath.substring(filePath.length-1, filePath.length) !== '/' && filePath.indexOf('.') !== -1) {
    return filePath.substring(0, filePath.lastIndexOf('.')) + '/';
  }
  return filePath;
}

async function handleGET(req, res, config) {
  let params = parseConfig(req, config);

  if (!params.conf) {
    return;
  }

  let key = params.conf.idKey || 'id';

  try {
    let o = JSON.parse(await utils.readFile(params.conf.file));

    if (!params.id) {
      res.send(o);
      return true;
    }

    let data, config;
    if (o.config) {
      data = o.posts || []
      config = o.config;
    } else {
      data = o;
    }

    for (let i in data) {
      if (data[i][key] == params.id) {
        if (config) {
          data[i].config = config;
        }
        res.send(data[i]);
        return true;
      }
    }

    res.send(ecb(`NO DATA for id:${params.id}`));
  } catch (e) {
    res.send(ecb(e.stack));
  }
  return true;
}

async function checkImageFolder(filePath, isMkdir) {

  return new Promise((resolve, reject) => {
    let path = getImageFolder(filePath);
    fs.stat(path, (e, o) => {
      if (e) {
        if (isMkdir) {

          // 필요하면 만든다.
          fs.mkdir(path, (e) => {
            if (e) {
              reject(e);
              return;
            }
            resolve(true);
          });
        } else {
          reject(e);
        }
        return;
      }
      resolve(true);
    });

  });

}


// http(s):// 로 시작하는 리소스를 서버에 저장하여 사용함.
async function fetchImageFile(imageUrl, targetFilePath, fileName, fileExtension) {

  let _targetFileName, _fileName, command;
  return new Promise((resolve, reject) => {
    try {

      _fileName = (fileName + imageUrl.replace(/^http(s|)\:\/\//g, '').replace(/\//g, '_'));
      if (fileExtension) {
        _fileName = fileName + '.' + fileExtension;
      }
      _targetFileName = targetFilePath + _fileName;
      command = 'curl -o "' + _targetFileName + '" "' + imageUrl + '"';

      console.log('이미지 다운로드 COMMAND:', command);

      exec(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 5
      }, function (error, stdout, stderr) {

        if (error) {
          reject(error);
          return;
        }
        resolve({
          file: _targetFileName,
          fileName: _fileName,
          fileNamePrefix: fileName
        })
      });

    } catch (e) {
      reject(e);
      return;
    }
  });
}


// data:image/jpeg;base64,/9j/4AAQSkZJRg.....
async function saveFile(base64String, targetFilePath, fileName) {
  return new Promise(async (resolve, reject) => {

    try {
      await checkImageFolder(targetFilePath, true);
    } catch (e) {
      reject(e);
      return;
    }

    let img = base64String.split(',');
    let type = img[0].replace(/(data:image\/|;base64)/g, '').replace('jpeg', 'jpg');
    let b = Buffer.from(img[1], 'base64');
    let file = targetFilePath + fileName + '.' + type;
    fs.writeFile(file, b, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        file: file,
        fileName: fileName + '.' + type,
        fileNamePrefix: fileName
      });
    });
  });

}


async function imageAutoSave(params, body) {
  return new Promise(async (resolve, reject) => {
    if (!params.conf.imagePath || !params.conf.imageSrcPrefix) {
      resolve(body);
      return;
    }

    const ts = new Date().getTime();
    const dom = new JSDOM(body);

    let imgs = dom.window.document.querySelectorAll('img'),
      ii,
      len = imgs.length;

    for (ii = 0; ii < len; ii++) {
      let img = imgs[ii].src;

      if (/^data:image\/(jpeg|png|gif);base64/.test(img)) {
        let oImg = await saveFile(img, params.conf.imagePath, params.id + '_' + ts + '_' + ii);
        console.log(oImg);
        if (oImg.file) {
          imgs[ii].src = params.conf.imageSrcPrefix + oImg.fileName;
        }
      } else if (/^http(|s)\:\/\//.test(img)) {
        let oImg = await fetchImageFile(img, params.conf.imagePath, params.id + '_' + ts + '_' + ii);
        console.log(oImg);
        if (oImg.file) {
          imgs[ii].src = params.conf.imageSrcPrefix + oImg.fileName;
        }
      }
    }
    body = dom.window.document.body.innerHTML;
    resolve(body);
  });

}


async function handlePOST(req, res, config) {
  let params = parseConfig(req, config);
  let body = req.body;

  if (!params.conf) {
    return;
  }

  let key = params.conf.idKey || 'id';

  for (const [k, v] of Object.entries(body)) {
    if (v.base64) {
      let oImg = await saveFile(v.base64, params.conf.imagePath, params.id + '_' + k);
      if (oImg.file) {
        v.image_url = params.conf.imageSrcPrefix + oImg.fileName;
        delete v.base64;
      }
    } else if (v.fetch_image_url && v.fetch_image_url_ext) {
      let oImg = await fetchImageFile(v.fetch_image_url, params.conf.imagePath, params.id + '_' + k, v.fetch_image_url_ext);
      if (oImg.file) {
        v.name = oImg.fileName;
        v.image_url = params.conf.imageSrcPrefix + oImg.fileName;
        delete v.fetch_image_url;
        delete v.fetch_image_url_ext;
      }
    }
  }

  // image 자동저장
  body.body = await imageAutoSave(params, body.body);

  if (!body) {
    res.send(ecb('body is required'));
    return;
  }

  if (!params.id) {
    res.send(ecb(':id is required'));
    return;
  }

  try {
    let o = JSON.parse(await utils.readFile(params.conf.file));
    let config = o.config;
    let data = config ? o.posts : o;
    delete body.config;

    let isUpdate = false;

    for (let i in data) {
      if (data[i][key] == params.id) {
        data[i] = body;
        isUpdate = true;
        break;
      }
    }

    if (!isUpdate) {
      data.push(body);
    }

    await utils.writeFile(params.conf.file, JSON.stringify(o, null, 2));
    res.send(o);

  } catch (e) {
    console.log(e);
    res.send(ecb(e.message));
  }
  return true;

}






module.exports = {
  handleGET: handleGET,
  handlePOST: handlePOST
}
