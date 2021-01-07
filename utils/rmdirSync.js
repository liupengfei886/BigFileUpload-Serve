const fs = require('fs')
/**
 * 递归删除某文件目录以及文件目录下所有文件
 * @param {*} filePath 文件目录路径
 */
function deleteFolder(filePath) {
  const files = []
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath)
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`
      const states = fs.statSync(nextFilePath)
      if (states.isDirectory()) {
        deleteFolder(nextFilePath)
      } else {
        fs.unlinkSync(nextFilePath)
      }
    })
    fs.rmdirSync(filePath)
  }
}

module.exports = deleteFolder