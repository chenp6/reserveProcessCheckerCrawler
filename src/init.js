import cheerio from 'cheerio';
import fetch from 'node-fetch';
import https from 'https';
import { newPage, NYCUPageManager } from './PageManager.js';
//Example 
/*
const NYCUDepartmentInfo = {
    exam: [112] => {
            type: '112 交大校區碩博班甄試',
            code: '61084878-2993-45d1-9df3-2de07839e2ff',
        }
        [112A] => {
            type: '112A陽明校區碩士班甄試',
            code: '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80'
        }
    dept: [112A_0300] => {
        name: "生化暨分子生物研究所"
        code: "a8dde90f-689e-49c0-9f14-42996d6a6881",
        table:[],
        currentReserve:''
    }

};
*/
const NYCUDepartmentInfo = {
    exam: new Map(),
    dept: new Map()
};
const page = await newPage();
const pageManager = new NYCUPageManager(page);
await pageManager.navigateToPage('https://enroll.nycu.edu.tw/');

async function init() {
    // const browser = await puppeteer.launch({ headless: false }); // 啟動瀏覽器，headless 設定為 false 可以看到瀏覽器運作的情況，true 為無頭瀏覽器
    // const page = await browser.newPage();
    // page = startNewPage(page);
    console.log("NYCU loading ...")
    await setDeptMap();

    // console.log(NYCUDepartmentInfo.dept.get("112_A41"))
    // console.log(NYCUDepartmentInfo.dept.get("112A_A41"))
    // console.log(NYCUDepartmentInfo.dept.get("112E_A41"))

    await updateDeptsInfo();
    const dept1 = NYCUDepartmentInfo.dept.get("112_A41");
    const dept2 = NYCUDepartmentInfo.dept.get("112_A42");
    const dept3 = NYCUDepartmentInfo.dept.get("112_A43")
    console.log(dept1.registered + "/" + dept1.want + "=>備取進度:" + dept1.currentReserve)
    console.log(dept2.registered + "/" + dept2.want + "=>備取進度:" + dept2.currentReserve)
    console.log(dept3.registered + "/" + dept3.want + "=>備取進度:" + dept3.currentReserve)
    console.log("====NYCU finished===")


}

async function setDeptMap() {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false
    });
    const url = 'https://enroll.nycu.edu.tw/'
    const res = await fetch(url, {
        method: 'GET',
        agent: httpsAgent

    })
    const resultHTML = await res.text();
    const $ = cheerio.load(resultHTML);




    $("select#ddlExamType option").each(async(i, el) => {
        const examCode = $(el).val();
        const examInfo = $(el).text().trim();

        const typeStartAt = getIndexofItemStart(examInfo);
        const examNo = examInfo.substring(0, typeStartAt);
        const examType = examInfo.substring(typeStartAt);
        NYCUDepartmentInfo.exam.set(examNo, {
            type: examType,
            code: examCode
        });
    })


    for (let [examNo, examInfo] of NYCUDepartmentInfo.exam) {
        const examCode = examInfo.code;
        await pageManager.selectExamType(examCode);
        const content = await page.content(); // 取得新頁面的內容
        const $$ = cheerio.load(content);

        const exampleDept = $$("select#ddlExamList option:selected").text().trim();
        const deptNameStartAt = getIndexofItemStart(exampleDept);
        $$("select#ddlExamList option").each(async(index, element) => {
                const deptCode = $$(element).val();
                const deptInfo = $$(element).text();

                const deptNo = examNo + "_" + deptInfo.substring(0, deptNameStartAt);
                const deptName = deptInfo.substring(deptNameStartAt);
                NYCUDepartmentInfo.dept.set(deptNo, {
                    name: deptName,
                    code: deptCode,
                    table: [],
                    currentReserve: "",
                    registered: 0,
                    want: 0
                });
            }

        )
    }
}

async function updateDeptsInfo() {
    for (let [deptNo, deptInfo] of NYCUDepartmentInfo.dept) {
        const examNo = deptNo.split('_')[0];
        console.log(deptInfo.name)
        const examCode = NYCUDepartmentInfo.exam.get(examNo).code;
        const deptCode = deptInfo.code;

        await pageManager.selectExamType(examCode);
        await pageManager.selectExamList(deptCode);
        const content = await page.content(); // 取得新頁面的內容
        const $ = cheerio.load(content);

        const rankTable = [];
        let reserveCounter = 1;
        const rowCount = $("#dgUserList tr").length;
        const cellCount = $("#dgUserList tr td").length;
        const colCount = parseInt(cellCount / rowCount);

        // colCount = 4
        // |考生編號|正備取|報考類別|報到狀況|  =>tr = 0
        // |   0   |  1   |    2  |   3   |


        // colCount = 5
        // |考生編號|學號|正備取|報考類別|報到狀況|  =>tr = 0
        // |   0   |  1 |  2  |    3   |   4   |

        //抓取考生編號欄號
        const idColNo = 0;

        //抓取正備取欄號
        const rankColNo = colCount == 4 ? 1 : 2;

        //抓取報到狀況欄號
        const statusColNo = colCount == 4 ? 3 : 4;

        let registered = 0;
        let want = 0;

        $("table > tbody > tr").each((index, element) => {
            if (index == 0) {
                return;
            }
            //td:eq(0)是抓取第一欄的文字 => 考生編號
            const id = $(element).find(`td:eq(${idColNo})`).text().trim();

            //td:eq(1)是抓取第二欄的文字 => 正備取
            let rank = $(element).find(`td:eq(${rankColNo})`).text().trim();

            if (rank == "備取") {
                rank = "備取" + reserveCounter; //備取+順位
                reserveCounter++;
            } else {
                want++;
            }



            //td:eq(3)是抓取第四欄的文字 => 報到狀況
            const status = $(element).find(`td:eq(${statusColNo})`).text().trim();
            if (status == "已報到!") {
                registered++;
            }

            const currentReserve = getCurrentReserveProcess(rank, status);
            if (currentReserve != null) {
                deptInfo.currentReserve = currentReserve;
            }


            const info = {
                id: id,
                rank: rank,
                status: status
            }
            rankTable.push(info);


        })
        deptInfo.table = rankTable;
        deptInfo.registered = registered;
        deptInfo.want = want;
    }
}


function getCurrentReserveProcess(rank, status) {
    if (rank == "正取" || rank == "直接") {
        if (status == "") {
            return "等待正取報到/放棄中";
        }
        return "目前未有備取名額，再耐心等一下(❁´◡`❁)";
    } else { //備取
        if (status == "備取") { //結束比對
            return null;
        } else { //空白(待報到)，已報到，放棄...等
            return rank;
        }
    }

}


/**
 * 取得 {id+item}格式之字串中的item首字元之index
 * id須由大寫與數字組成   
 * item的首字元需不為大寫或數字
 * @param {*} str 
 */
function getIndexofItemStart(str) {
    let itemStartAt = 0;
    for (let i = 0; i < str.length; i++) {
        if ((str.charCodeAt(i) >= 48 && str.charCodeAt(i) <= 57) ||
            ((str.charCodeAt(i) >= 65 && str.charCodeAt(i) <= 90))) {
            itemStartAt += 1;
        } else {
            break;
        }
    }
    return itemStartAt;
}

function delay(sec) {
    return new Promise(function(resolve) {
        setTimeout(resolve, sec * 1000);
    });
}