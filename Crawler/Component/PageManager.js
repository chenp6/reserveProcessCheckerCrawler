import puppeteer, { TimeoutError } from 'puppeteer';
// import chromium from "chrome-aws-lambda";
// import playwright from "playwright-core";
export async function newPage(headless) {
    const browser = await puppeteer.launch({ headless: headless }); // 啟動瀏覽器，headless 設定為 false 可以看到瀏覽器運作的情況，true 為無頭瀏覽器
    const page = await browser.newPage();
    return page;
}

export class NYCUPageManager {

    constructor(page) {
        this.page = page;
    }

    async selectExamType(examCode) {
        const typeSelector = 'select#ddlExamType';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + "  option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == examCode) return;

        await this.page.select(typeSelector, examCode); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }

    async selectExamList(deptNo) {
        const typeSelector = 'select#ddlExamList';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == deptNo) return;

        await this.page.select(typeSelector, deptNo); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }


}




export async function navigateToPage(page, url) {
    await page.goto(url);
}