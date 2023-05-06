import cheerio from 'cheerio';
import fetch from 'node-fetch';
import https from 'https';
import { updateTable } from './Utils.js';
//Example 
/*
【group table】
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
/*
【process table】

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



/*
const NKUSTRegisterInfo = {
    exam: [111,2,29] => {
            type: '"111學年度日間部四技轉學考（二年級）'
        }
    group: [examNo_111,2,30,UD031400,00,00,00] => {
        name: "XXXXXXXXXXX系所 OO組"
    },
    process :[{
        idField:{
            groupId:<groupId>,
            userId:<userId>
        },
        content:{
            index:<index>,
            rank:<rank>,
            status:<status>
        }
    },...]

};
*/
const NKUSTRegisterInfo = {
    exam: new Map([
        // ["111,2,29", { type: "111學年度日間部四技轉學考（二年級）" }],
        // ["111,2,30", { type: "111學年度日間部四技轉學考（三年級）" }],
        // ["111,2,31", { type: "111學年度進修部四技轉學考（二年級）" }],
        // ["111,2,32", { type: "111學年度進修部四技轉學考（三年級）" }]
    ]),
    group: new Map(),
    process: []
};


export async function init() {

    console.log("=== NKUST loading ===")
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== NKUST done ===")

}


async function setGroupMap() {
    for (const examNo of NKUSTRegisterInfo.exam.keys()) {
        const examInfoList = examNo.split(",");
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
        const url = `https://webap.nkust.edu.tw/enroll/e_enroll1.jsp?year=${examInfoList[0]}&sms=${examInfoList[1]}&op_kind=finget&enrollid=${examInfoList[2]}`;
        const res = await fetch(url, {
            method: 'POST',
            agent: httpsAgent
        })
        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);

        $("table > tbody > tr").each(async(index, element) => {
            // |所屬校區|院別|報考系所別| 組別 | 身分別|
            // |  0    | 1  |   2     |  3   |  4   |
            //go_next('111','2','30','UD031400','00','00','00') => groupNo: 111,2,30,UD031400,00,00,00
            const groupHref = $(element).find(`td:eq(2)`).attr("onclick");
            if (groupHref == undefined) return;
            const groupNo = groupHref.trim().replace("go_next(", "").replace(/(['"])/g, "").replace(")", "");

            //td:eq(1)是抓取第二欄的文字 => 組別名稱
            const groupName = $(element).find(`td:eq(2)`).first().text().trim();

            //name:系所名稱及班別 組別名稱
            //>>> ex:地球科學學系地球物理碩士班	不分組(一般生)
            NKUSTRegisterInfo.group.set(examNo + "_" + groupNo, {
                name: groupName
            });

        })

    }
}


export async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NKUSTRegisterInfo.group) {
        const groupList = groupId.split('_');
        const examNo = groupList[0];
        const groupNo = groupList[1];

        const groupQueries = groupNo.split(",");

        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
        const url = `https://webap.nkust.edu.tw/enroll/e_enroll_get3.jsp?year=${groupQueries[0]}&sms=${groupQueries[1]}&enrollid=${groupQueries[2]}&clsid=${groupQueries[3]}&untdup=${groupQueries[4]}&stdkind=${groupQueries[5]}&groupid=${groupQueries[6]}&edata_year=${groupQueries[0]}&edata_sms=${groupQueries[1]}&edata_enrollid=${groupQueries[2]}&edata_clsid=${groupQueries[3]}&edata_untdup=${groupQueries[4]}&edata_stdkind=${groupQueries[5]}&edata_groupid=${groupQueries[6]}&kind=finget`;
        const res = await fetch(url, {
            method: 'POST',
            agent: httpsAgent
        })
        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);

        let registered = 0;
        let want = 0;
        let currentReserve = "";
        let startIndex = 0;
        $("table > tbody > tr").each(async(index, element) => {
            // colCount = 3 (正取)
            // |准考證號|報到別|報到日期|  
            // |   0   |  1   |    2  |

            // colCount = 4 (備取)
            // |准考證號|備取順序|報到別|報到日期| 
            // |   0   |   1   |  2  |    3  |         
            const colCount = $(element).children().length;
            const firstCol = $(element).find(`td:eq(0)`).text().trim();

            let status;
            let rank;
            if (firstCol == "准考證號") { //標題列
                startIndex++;
                return;
            } else if (colCount == 3) {
                status = $(element).find(`td:eq(1)`).text().trim();
                rank = "正取";
            } else if (colCount == 4) {
                status = $(element).find(`td:eq(2)`).text().trim();
                rank = $(element).find(`td:eq(1)`).text().trim();
            } else {
                startIndex++;
                return;
            }


            //td:eq(0)是抓取第一欄的文字 => 准考證號
            const userId = $(element).find("td:eq(0)").text().trim();


            if (status == "報到") {
                registered++;
            }

            if (rank == "正取") {
                want++;
            }


            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }

            /*
             idField => 
            {
                groupId:CCU_<groupId>,
                userId:<userId>
            }
             *content =>
             * {
             *      index:<index>,
             *      rank:<rank>,
             *      status:<status>
             * }
             */
            NKUSTRegisterInfo.process.push({
                idField: {
                    groupId: "NKUST_" + groupId,
                    userId: userId
                },
                content: {
                    index: index - startIndex,
                    rank: rank,
                    status: status
                }
            });
        })


        /*
        idField => {
            school:"CCU",
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
        await updateTable("group", {
            school: "NKUST",
            examNo: examNo,
            groupNo: groupNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });
    }


    function updateReserveProcess(rank, status) {
        if (rank == "正取") { //正取
            return "尚未有遞補名額";
        } else if (status == "報到") { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }

    //update database - process table
    for (const processInfo of NKUSTRegisterInfo.process) {
        await updateTable("process", processInfo.idField, processInfo.content);
    }
}