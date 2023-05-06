import cheerio from 'cheerio';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { updateTable } from './Utils.js';
import { newPage, NKNUPageManager, navigateToPage } from './PageManager.js';

//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NKNURegisterInfo = {
    exam: new Map([
        ["6,A", { type: "碩班", code: 223050 }],
    ]),
    group: new Map()
};

const page = await newPage();
const pageManager = new NKNUPageManager(page);



export async function init() {
    console.log("=== NKNU loading ===")
    await navigateToPage(page, 'https: //sso.nknu.edu.tw/AcademicAffairs/Freshman/');
    await setGroupMap();
    await updateGroupsInfo()
    console.log("=== NKNU done ===")

}

async function setGroupMap() {

    for (let [examNo, examInfo] of NKNURegisterInfo.exam) {

        //榜單網頁
        let rankUrl = `http://www.etkb.com.tw/etkb/connects/upload/${examInfo.code}.txt` //第一階錄取科系
        let rankRes = await fetch(rankUrl, {
            method: 'GET'
        })
        const rankResultText = await rankRes.text();
        const $ = cheerio.load(rankResultText);
        const resultArr = rankResultText.split('\n');
        let reserveList = [];
        let list = [];
        let num = 0;

        for (let i = 2; i < resultArr.length; i++) { //從第一個空白行開始
            if (resultArr[i].includes("正取")) {
                reserveList.push(list);
                list = [];
                i++; //跳過名字列
            } else if (!resultArr[i].includes("備取")) {
                const rowList = resultArr[i].split(" ");
                list.push(...rowList); //准考證號
                i += 1; //跳過名字列
            }

        }
        //first line = title
        //跳過以前的空白行
        //各系組組成: <學系>,<正取(人數)>,<正取名單>...,<備取(人數)>,<備取名單>...(空白)
        //遇人數滿類型則
        const idList = [];
        $("table > tbody > tr > td").each((index, element) => {
            const id = $(element).text().trim();
            if (index % 2 == 0 && id != '') {
                idList.push(id);
            }
        })





        let examArr = examNo.split(",");
        const system = examArr[0];
        const examType = examArr[1];

        await pageManager.selectExamSystem(system);
        await pageManager.selectExamType(examType);

        const content = await page.content(); // 取得新頁面的內容
        const $$ = cheerio.load(content);


        $$("select#ctl00_phMain_uProgram option").each(async(index, element) => {
                const groupVal = $$(element).val();
                const groupName = $$(element).text();

                const groupNo = examNo + "_" + groupVal;
                NKNURegisterInfo.group.set(groupNo, {
                    name: groupName,
                });
            }

        )
    }
}

async function updateGroupsInfo() {
    for (const [groupNo, groupInfo] of NKNURegisterInfo.group) {
        const groupArr = groupNo.split('_');

        const examNo = groupArr[0];
        const examArr = examNo.split(',');
        const system = examArr[0];
        const examType = examArr[1];

        const groupVal = groupArr[1];

        await pageManager.selectExamSystem(system);
        await pageManager.selectExamType(examType);
        await pageManager.selectExamList(groupVal);

        const content = await page.content(); // 取得新頁面的內容
        const $ = cheerio.load(content);



        // |  姓名 |錄取身份|錄取順序 |報到狀況|備 註
        // |   0   |   1   |    2   |   3   |  4


        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("#ctl00_phMain_uList > tbody > tr").each(async(index, element) => {
            if (index == 0) {
                return;
            }

            //td:eq(0)是抓取第一欄的文字 => 考生編號
            const userId = $(element).find(`td:eq(${idColNo})`).text().trim();

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

            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }

            /*
            idField => 
            {
                groupId:<groupId>,
                userId:<userId>
            }
             *content =>
             * {
             *      index:<index>,
             *      rank:<rank>,
             *      status:<status>
             * }
             */
            await updateTable("process", {
                groupId: "NYCU_" + groupNo,
                userId: userId
            }, {
                index: index,
                rank: rank,
                status: status
            });

        });
        /*
            idField => {
                school:"NYCU",
                examNo:<examNo>
                groupNo:<groupNo>
            }
            content =>
            {
                name: groupName,
                currentReserve: "",
                registered: 0,
                want: 0
            }
        */
        const queries = groupNo.split('_');
        await updateTable("group", {
            school: "NYCU",
            examNo: queries[0],
            groupNo: queries[1]
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });
    }

    /**
     * 根據該生之rank及status更新目前的備取進度
     * @param {*} rank 名次   
     * @param {*} status 目前狀況  
     * @returns 更新後的進度
     */
    function updateReserveProcess(rank, status) {
        if (rank == "正取" || rank == "直接") {
            return "尚未有遞補名額";
        } else if (status == "已報到!") { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }

}