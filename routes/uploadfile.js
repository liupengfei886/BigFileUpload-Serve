var express = require('express');
var router = express.Router();
const path = require('path')
const multer = require('multer')
const upload = multer({ dest: path.join(__dirname, '../uploads') })

const FileController = require('../controller/uploadfile')

router.route('/hash_check')
  .post(FileController.hashCheck)

router.route('/chunks_upload')
  .post(upload.single('file'), FileController.chunksUpload)

router.route('/chunks_merge')
  .post(FileController.chunksMerge)
  
module.exports = router;
