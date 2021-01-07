const fs = require('fs');
const Promise = require('bluebird');
const stream = require('readable-stream');
/**
 * 通过管道流合并所有的文件
 * @param {array} inputPathList 被合并文件的路径集合
 * @param {string} outputPath 输出文件的路径
 * @param {int} chunkSize[optional]
 * 
 * @returns {Promise}
 */
const streamMerge = (inputPathList, outputPath, chunkSize = 2 * 1024 * 1024) => {
  // Validate inputPathList.
  if (inputPathList.length <= 0) {
    return Promise.reject(new Error("Please input an array with files path!"));
  }

  // create writable stream for output
  const output = fs.createWriteStream(outputPath, {
    encoding: null
  });
  // console.log('inputPathList', inputPathList)
  return Promise.mapSeries(inputPathList, function (item) {
    // console.log('item', item)
    return new Promise(function (resolve, reject) {
      const input = fs.createReadStream(item, {
        encoding: null
      });

      const inputStream = new stream.Readable({
        // equivalent to controlling the size of a bucket
        highWaterMark: chunkSize // the size of each on data of the control flow, the default is 16kb
      }).wrap(input)

      // pipeline data flow
      inputStream.pipe(output, {
        end: false
      });
      inputStream.on('error', reject);
      inputStream.on('end', resolve);
    });
  }).then(function () {
    // close the stream to prevent memory leaks
    output.close();
    return Promise.resolve(outputPath);
  }).catch(error => {
    return Promise.reject(error);
  });
}
module.exports = streamMerge