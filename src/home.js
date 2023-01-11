import express from 'express'; //載入express框架模組
const router = express.Router();

router.get("/", async(req, res, next) => {
    let str = "index.html"; //引號內放入要切換的html檔案頁面
    return res.sendFile(str, { root: './src' }); // {root:'裡面html資料的資料夾相對位址'}
});

export default router