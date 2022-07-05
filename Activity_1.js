// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

//  node Activity_1.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
let args=minimist(process.argv);

// console.log(args.source);
// console.log(args.excel);

let responseKaPromise=axios.get(args.source);
responseKaPromise.then(function(response){
    let html=response.data;
    // console.log(html);
    // fs.writeFileSync("Crickinfo.html",html);
    let dom=new jsdom.JSDOM(html);
    let document=dom.window.document;
    // console.log(document.title);

    let matchesDivs=document.querySelectorAll("div.match-score-block");
    let matches=[];
    // console.log(matchesDivs.length);
    for(let i=0;i<matchesDivs.length;i++){
        let match={
            t1:"",
            t2:"",
            t1s:"",
            t2s:"",
            result:""
        }
        let teamName=matchesDivs[i].querySelectorAll("div.name-detail>p.name");
        // console.log(teamName.length);
        match.t1=teamName[0].textContent;
        match.t2=teamName[1].textContent;

        let spanScore=matchesDivs[i].querySelectorAll("div.score-detail>span.score");
      // console.log(spanScore.length);
        if(spanScore.length==2){
           match.t1s=spanScore[0].textContent;
           match.t2s=spanScore[1].textContent;
        }
        else if(spanScore.length==1){
            match.t1s=spanScore[0].textContent;
            match.t2s="";
        }
        else{
            match.t1s="";
           match.t2s="";
        }

        let resultSpan=matchesDivs[i].querySelector("div.status-text>span").textContent;
        match.result=resultSpan;
        matches.push(match);
    }
//   console.log(matches);
let matchesJSON=JSON.stringify(matches);
fs.writeFileSync("matches.json",matchesJSON,"utf-8");

let teams=[];
for(let i=0;i<matches.length;i++){
    putTeamInTeamArraysIfMissing(teams,matches[i].t1);
    putTeamInTeamArraysIfMissing(teams,matches[i].t2);
}

for(let i=0;i<matches.length;i++){
    // console.log(matches[i].t1);
    // console.log(matches[i].t2);
    // console.log(matches[i].t1s);
    // console.log(matches[i].t2s);
    // console.log(matches[i].result);
    // console.log("```````````````````");
    putMatchInAppropriateTeam(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
    putMatchInAppropriateTeam(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);
}
// console.log(teams);
let teamsJSON=JSON.stringify(teams);
fs.writeFileSync("teams.json",teamsJSON,"utf-8");

createExcelFile(teams);

createFolders(teams);
}).catch(function(err){
    console.log(err);
})

function putTeamInTeamArraysIfMissing(teams,teamName){
    let tidx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==teamName){
            tidx=i;
            break;
        }
    }
    if(tidx==-1){
        teams.push({
            name:teamName,
            match:[]
        })
    }
}

function putMatchInAppropriateTeam(teams,homeTeam,oppTeam,selfScore,oppScore,result){
    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==homeTeam){   // Silly mistake kri yha teams[i] nhi lya khali teams liya tha agge dhyan rakhunga
            t2idx=i;
            break;
        }
    }
    // console.log(homeTeam);
    // console.log(oppTeam);
    // console.log(selfScore);
    // console.log(oppScore);
    // console.log(result);
    // console.log(t2idx);
    if(t2idx!=-1){
    let team=teams[t2idx];
    team.match.push({
        vs:oppTeam,
        SelfScore:selfScore,
        OppScore:oppScore,
        Result:result
    });
}
}

function createExcelFile(teams){
    let wb = new excel.Workbook();

    for(let i=0;i<teams.length;i++){
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("Self-Score");
        sheet.cell(1,3).string("Opp-Score");
        sheet.cell(1,4).string("Result");
        for(let j=0;j<teams[i].match.length;j++){
            sheet.cell(j+2,1).string(teams[i].match[j].vs);
            sheet.cell(j+2,2).string(teams[i].match[j].SelfScore);
            sheet.cell(j+2,3).string(teams[i].match[j].OppScore);
            sheet.cell(j+2,4).string(teams[i].match[j].Result);
        }
    }
    wb.write(args.excel);
}

function createFolders(teams){
    
    if(fs.existsSync(args.dataFolder) == true){
        fs.rmdirSync(args.dataFolder, { recursive: true });
    }

    fs.mkdirSync(args.dataFolder);
    
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].match.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].match[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].match[j], matchFileName);
            // console.log(matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName){
    let t1=teamName;
    let t2=match.vs;
    let t1s=match.SelfScore;
    let t2s=match.OppScore;
    let result=match.Result;

    let bytesOfPDFTemplate = fs.readFileSync("WorldCup.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 729,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 715,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 701,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 687,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 673,
            size: 8
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            if(fs.existsSync(matchFileName + ".pdf") == true){
                fs.writeFileSync(matchFileName + "1.pdf", finalPDFBytes);
            } else {
                fs.writeFileSync(matchFileName + ".pdf", finalPDFBytes);
            }
        })
    })
}