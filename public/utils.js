export function parseCookiesArray(cookies){
    cookies = cookies.split(',');
    for(let i=0;i<cookies.length;i++){
        cookies[i] = cookies[i].split(';')[0]+";";
    }
    return cookies;
}

export function parseCookiesStr(cookies){
    return parseCookiesArray(cookies).join(' ');;
}