import express from 'express'; //載入express框架模組
const router = express.Router();

router.get("/", async(req, res, next) => {
    return res.status(200).json({
        title: "Express Testing",
        message: "The app is working properly!",
    });
});

export default router