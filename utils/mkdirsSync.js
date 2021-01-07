const path = require('path')
const fs = require('fs')
/**
 * 递归创建多级目录
 * @param {*} dirname 目录路径
 */
const mkdirsSync = dirname => {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}

module.exports = mkdirsSync