/* eslint-disable no-unused-expressions */
const axios = require('axios');
const { promisify } = require('util');
const downloadGitRepo = promisify(require('download-git-repo'));
const { spawn } = require('child_process');
const { dialog } = require('electron');
let { render } = require('consolidate').ejs;
const fs = require('fs');
const path = require('path');

render = promisify(render);

const { downloadRootDir } = require('./constants');

const handleError = (error) => {
  dialog.showErrorBox('boom!', JSON.stringify(error));
};

const fetchGit = async (url) => {
  const { data } = await axios({
    url,
    headers: {
      Accept: 'application/vnd.github.v3+json,application/json'
    }
  });
  return data;
};

// eslint-disable-next-line camelcase
const downloadRepo = async ({ name, full_name }) => {
  const dest = `${downloadRootDir}/.sliver-cli/${name}`;
  await downloadGitRepo(full_name, dest);
  return dest;
};

const renderTemplate = (files, data) => {
  Object.keys(files).forEach(async (item) => {
    if (item.includes('js') || item.includes('json') || item.includes('md')) {
      let content = files[item].contents.toString();
      if (content.includes('<%')) {
        content = await render(content, data);
        if (item.includes('json')) {
          content = JSON.stringify(JSON.parse(content), null, 2);
        }
        // eslint-disable-next-line no-param-reassign
        files[item].contents = Buffer.from(content);
      }
    }
  });
};

let workerProcess;

const handleExec = ({ destination, shell, detached }, callback) => {
  workerProcess = spawn(`chcp 65001 && ${shell}`, {
    cwd: destination,
    windowsHide: false,
    shell: true,
    detached: detached || false
  });

  // 打印正常的后台可执行程序输出
  workerProcess.stdout.on('data', (data) => {
    console.log(`stdout:${data}`);
  });
  // 打印错误的后台可执行程序输出
  workerProcess.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
  // // 退出之后的输出
  workerProcess.on('close', (code) => {
    console.log(`out code：${code}`);
  });

  workerProcess.on('exit', (code) => {
    console.log(`exit:${code}`);
    if (typeof callback === 'function') {
      callback();
    }
  });
};

const wirteJson = (file, data, callback) => {
  const str = JSON.stringify(data, null, '\t');
  try {
    fs.writeFileSync(file, str);
    callback();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const isExisted = (destination, array) => {
  const idx = array.findIndex((item) => item.destination === destination);
  return idx !== -1;
};

const genID = () => Number(Math.random().toString().substr(3, 8) + Date.now()).toString(36);

const readPackageInfo = (destination) => {
  const jsonSrc = path.join(destination, 'package.json');
  if (fs.existsSync(jsonSrc)) {
    return JSON.parse(fs.readFileSync(jsonSrc));
  }
  return null;
};

module.exports = {
  fetchGit,
  downloadRepo,
  renderTemplate,
  handleError,
  handleExec,
  wirteJson,
  isExisted,
  genID,
  readPackageInfo
};
