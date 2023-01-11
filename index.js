import express, { json } from 'express'; //載入express框架模組
import cors from 'cors';
let app = express();

// Middlewares
app.use(express.json());

// Routes
app.use('/src',express.static('./src'));
app.get('/home',(req,res)=>{
    let str = "src/index.html";  //引號內放入要切換的html檔案頁面
    res.sendFile(str);
});

// connection
const port = process.env.PORT || 9001;
app.listen(port, () => console.log(`Listening to port ${port}`));