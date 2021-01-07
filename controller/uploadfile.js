const path = require('path');
const fs = require('fs');
// 定义文件上传路径
const uploadPath = path.join(__dirname, '../uploads')
const streamMerge = require('../utils/steamMerge')
// const { streamMerge } = require('split-chunk-merge')
const mkdirsSync = require('../utils/mkdirsSync')
const deleteFolder = require('../utils/rmdirSync')

module.exports = {
  hashCheck: async (req, res, next) => {
    const { name, total, chunkSize, hash } = req.body
    const _name = name.split('.')
    const fileName = _name.splice(0, _name.length - 1).join('.')
    const suf = _name.pop()
    const _fileName = `${fileName}-${hash}.${suf}`
    const filePath = path.join(uploadPath, _fileName)
    if (fs.existsSync(filePath)) {
      res.status(200).json({
        success: true,
        msg: '检查成功，文件在服务器上已存在，不需要重复上传',
        data: {
          type: 2, // type=2 为文件已上传过
        }
      })
    } else {
      const chunksPath = path.join(uploadPath, hash + '-' + chunkSize, '/')
      if (fs.existsSync(chunksPath)) {
        const chunks = fs.readdirSync(chunksPath);
        if (chunks.length !== 0 && chunks.length === total) {
          res.status(200).json({
            success: true,
            msg: '文件分片在服务器上已存在，但没有合并文件',
            data: {
              type: 2, // type=2 为文件已上传过
            }
          })
        } else {
          const index = []
          // 保存已经上传成功的文件分片的下标
          chunks.forEach(item => {
            const chunksNameArr = item.split('-')
            index.push(chunksNameArr[chunksNameArr.length - 1])
          })
          res.status(200).json({
            success: true,
            msg: '检查成功，需要断点续传',
            data: {
              type: 1, // type=1 文件需要断点续传
              index // 已上传文件分片的下标
            }
          })
        }
      } else {
        res.status(200).json({
          success: true,
          msg: '检查成功',
          data: {
            type: 0
          }
        })
      }
    }
  },
  chunksUpload: async (req, res, next) => {
    const {
      name,
      total,
      index,
      size,
      chunkSize,
      hash
    } = req.body;
    // 使用multer中间件，通过req.file获取文件相关信息
    const file = req.file
    const chunksPath = path.join(uploadPath, hash + '-' + chunkSize, '/');
    if (!fs.existsSync(chunksPath)) {
      mkdirsSync(chunksPath);
    }
    // 不使用fs.renameSync， 因为在windonw开发时可能会出现跨分区权限问题
    // file.path为multer设置的临时文件（上传成功后需要删除），借助管道流将文件转移到/uploads目录下的格式为{文件Hash}-{文件大小}的目录下
    const readStream = fs.createReadStream(file.path)
    const writeStream = fs.createWriteStream(chunksPath + hash + '-' + index);
    // 管道输送
    readStream.pipe(writeStream);
    readStream.on('end', function () {
      // 删除临时文件
      fs.unlinkSync(file.path)
    });
    res.status(200).json({
      success: true,
      msg: '上传成功',
      data: null
    })
  },
  chunksMerge: async (req, res, next) => {
    const {
      chunkSize,
      name,
      total,
      hash
    } = req.body;
    // 根据hash值，获取分片文件。
    const chunksPath = path.join(uploadPath, hash + '-' + chunkSize, '/');
    const _name = name.split('.')
    const fileName = _name.splice(0, _name.length - 1).join('.')
    const suf = _name.pop()
    // 合并后的文件名格式为 {文件名称}-{Hash值}.{文件后缀}
    const filePath = path.join(uploadPath, `${fileName}-${hash}.${suf}`);
    // 读取所有的chunks 文件名存放在数组中
    let chunks = fs.readdirSync(chunksPath);
    const chunksPathList = []
    if (chunks.length !== total || chunks.length === 0) {
      res.status(200).json({
        success: false,
        msg: '切片文件数量与请求不符合，无法合并',
        data: null
      })
    }
    // 将读取到的文件分片名称按照文件分片下标排序，否则会出现合并顺序错乱导致无法正常打开文件的问题
    chunks = chunks.sort(function(a, b) {
      const _a = a.split('-')
      const aIndex = _a[_a.length - 1]
      const _b = b.split('-')
      const bIndex = _b[_b.length - 1]
      return Number(aIndex) - Number(bIndex)
    })
    chunks.forEach(item => {
      chunksPathList.push(path.join(chunksPath, item))
    })

    try {
      const result = await streamMerge(chunksPathList, filePath, chunkSize)
      console.log('result', result)
      // 合并成功后，删除文件分片文件夹
      const dirPath = path.join(uploadPath, hash + '-' + chunkSize)
      deleteFolder(dirPath)

      res.status(200).json({
        success: true,
        msg: '合并成功',
        data: null
      })
    } catch(error) {
      res.status(200).json({
        success: false,
        msg: `由于${error}导致合并失败，请重试`,
        data: null
      })
    }
  }
}