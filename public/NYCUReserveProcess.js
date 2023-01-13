import cheerio from 'cheerio';
import fetch from 'node-fetch';
import https from 'https';
import { newPage, NYCUPageManager,navigateToPage } from './PageManager.js';
//Example 
/*
const NYCURegisterInfo = {
    exam: [112] => {
            type: '112 交大校區碩博班甄試',
            code: '61084878-2993-45d1-9df3-2de07839e2ff',
        }
        [112A] => {
            type: '112A陽明校區碩士班甄試',
            code: '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80'
        }
    group: [112A_0300] => {
        name: "生化暨分子生物研究所"
        code: "a8dde90f-689e-49c0-9f14-42996d6a6881",
        table:
        "xxxxxx(考生編號)"=>{

        },
        reserveProcess:'',
        want:16,
        registered:10
    }

};
*/
const NYCURegisterInfo = {
    exam: new Map(),
    group: new Map()
};
const page = await newPage();
const pageManager = new NYCUPageManager(page);


export async function init() {
    // const browser = await puppeteer.launch({ headless: false }); // 啟動瀏覽器，headless 設定為 false 可以看到瀏覽器運作的情況，true 為無頭瀏覽器
    // const page = await browser.newPage();
    // page = startNewPage(page);
    console.log("=== NYCU loading ===")

    await navigateToPage(page,'https://enroll.nycu.edu.tw/');
    await setGroupMap();
    // console.log(NYCUDepartmentInfo.group.get("112_A41"))
    // console.log(NYCUDepartmentInfo.group.get("112A_A41"))
    // console.log(NYCUDepartmentInfo.group.get("112E_A41"))

    await updateGroupsInfo();
    // const group1 = NYCUDepartmentInfo.group.get("112_A41");
    // const group2 = NYCUDepartmentInfo.group.get("112_A42");
    // const group3 = NYCUDepartmentInfo.group.get("112_A43")
    // console.log(group1.registered + "/" + group1.want + "=>備取進度:" + group1.reserveProcess)
    // console.log(group2.registered + "/" + group2.want + "=>備取進度:" + group2.reserveProcess)
    // console.log(group3.registered + "/" + group3.want + "=>備取進度:" + group3.reserveProcess)
    console.log("=== NYCU done ===")

}

async function setGroupMap() {
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
        NYCURegisterInfo.exam.set(examNo, {
            type: examType,
            code: examCode
        });
    })


    for (let [examNo, examInfo] of NYCURegisterInfo.exam) {
        const examCode = examInfo.code;
        await pageManager.selectExamType(examCode);
        const content = await page.content(); // 取得新頁面的內容
        const $$ = cheerio.load(content);

        const exampleGroup = $$("select#ddlExamList option:selected").text().trim();
        const groupNameStartAt = getIndexofItemStart(exampleGroup);
        $$("select#ddlExamList option").each(async(index, element) => {
                const groupCode = $$(element).val();
                const groupInfo = $$(element).text();

                const groupNo = examNo + "_" + groupInfo.substring(0, groupNameStartAt);
                const groupName = groupInfo.substring(groupNameStartAt);
                NYCURegisterInfo.group.set(groupNo, {
                    name: groupName,
                    code: groupCode,
                    table: [],
                    reserveProcess: "",
                    registered: 0,
                    want: 0
                });
            }

        )
    }
}

export async function updateGroupsInfo() {
    for (const [groupNo, groupInfo] of NYCURegisterInfo.group) {
        const examNo = groupNo.split('_')[0];

        const examCode = NYCURegisterInfo.exam.get(examNo).code;
        const groupCode = groupInfo.code;

        await pageManager.selectExamType(examCode);
        await pageManager.selectExamList(groupCode);
        const content = await page.content(); // 取得新頁面的內容
        const $ = cheerio.load(content);

        const rankTable = new Map();
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

            const reserveProcess = updateReserveProcess(rank, status);
            if (reserveProcess != null) {
                groupInfo.reserveProcess = reserveProcess;
            }


            const info = {
                index: index,
                rank: rank,
                status: status
            };
            rankTable.set(id, info);


        })
        groupInfo.table = rankTable;
        groupInfo.registered = registered;
        groupInfo.want = want;
    }

    /**
     * 根據該生之rank及status更新目前的備取進度
     * @param {*} rank 名次   
     * @param {*} status 目前狀況  
     * @returns 更新後的進度
     */
    function updateReserveProcess(rank, status) {
        if (rank == "正取" || rank == "直接") {
            return "(っ °Д °;)っ目前尚未有備取名額";
        } else if (status == "備取") { //備取且還未備取到
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
 * @param {*} str {id+item}格式之字串
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

export function getUserRank(groupNo, userExamId) {
    const table = NYCURegisterInfo.group.get(groupNo)?.table;
    if (table == undefined) {
        return {
            index: null,
            rank: null,
            status: null
        };
    } else {
        return table.get(userExamId);
    }
}

export function getReserveProcess(groupNo) {
    const info = NYCURegisterInfo.group?.get(groupNo);
    if (info == undefined) {
        return {
            registered: null,
            want: null,
            reserveProcess: null
        };
    } else {

        return {
            registered: info.registered,
            want: info.want,
            reserveProcess: info.reserveProcess
        }

    }


}