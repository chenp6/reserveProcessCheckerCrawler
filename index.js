import express, { json } from 'express'; //載入express框架模組
import cors from 'cors';
import home from "./src/home.js";
import * as homepage from './src/index.html';


let app = express();

// Middlewares
app.use(express.json());

// Routes
app.get("/home",(req,res)=>{
    let str = "index.html";  //引號內放入要切換的html檔案頁面
    res.sendFile(str,{root:'.'});// {root:'裡面html資料的資料夾相對位址'}
});

app.get("/", async(req, res, next) => {
    return res.status(200).json({
        title: "Express Testing",
        message: "The app is working properly!",
    });
});
// connection
const port = process.env.PORT || 9001;
app.listen(port, () => console.log(`Listening to port ${port}`));