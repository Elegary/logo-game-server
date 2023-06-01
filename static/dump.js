// Nodejs to download a list of images from a website
// and save them to a folder on your computer

const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

// Charger le fichier HTML
const categoriesInfos = require('./categories.json');

let allData = [];

async function saveAndDownloadImg(infos){
    // Download the image from the url using axios module
    // and save it to a folder on your computer
    let name = infos.name;
    let url = infos.imgSrc;

    url = "http://companieslogo.com" + url;
    const filename = url.split('/128/')[1].split('?')[0]
    //console.log(filename);

    // check if the file already exists
    if(fs.existsSync('images/' + filename)){
        console.log("File already exists");
    }

    else {
        const file = fs.createWriteStream('images/' + filename)
        // check if error
        await axios.get(url, {responseType: 'stream'}).then(response => {
            response.data.pipe(file)
        })
        .catch(error => {
            console.log("Error : " + error);
        });
        
       //console.log("Downloading " + name + " from " + url);
    }

    //allData.push({name: name, filename: filename, textId: infos.textId, categories: []});
    // {name: name, filename: filename, textId: infos.textId, categories: []}

    // search if already exists, if yes, add the current category to the categories array
    // loop through allData
    let found = false;
    for(let i = 0; i < allData.length; i++){
        let data = allData[i];
        if(data.textId == infos.textId){
            // add category to categories array
            data.categories.push(infos.category);
            found = true;
            break;
        }
    }
    if(!found){
        allData.push({name: name, filename: filename, textId: infos.textId, categories: [1, infos.category]});
    }
        

}

async function extractLinks(){

    // URLS are form : https://companieslogo.com/fr/logos/ + category[x].textId
    // there are multiple pages for each category, it end when https://companieslogo.com/fr/logos/ + category[x].textId + / PAGENUMBER give a 404
    // do a loop for each category
    for(let i = 0; i < categoriesInfos.length; i++){
        let category = categoriesInfos[i];
        console.log("Current category : " + category.name);
        console.log("Progress : " + (i + 1) + "/" + categoriesInfos.length);
        let page = 1;
        // if page = 1, no need to add it to the url
        let continueLoop = true;
        let caterogyData = [];
        while(continueLoop){
            let url;
            console.log("Current page : " + page);
            if(page == 1){
                url = "https://companieslogo.com/fr/logos/" + category.textId;
            } else {
                url = "https://companieslogo.com/fr/logos/" + category.textId + "/" + (page + 1);
            }
            await axios.get(url, {maxRedirects: 0}).then(async (response) => {
                if(response.status == 200){
                        let html = response.data;
                        const $ = cheerio.load(html);
                        // get all div with "list-item list-item-sq-small"
                        let divs = $('div.list-item.list-item-sq-small');
                        // for each div, extract img, div with class name and a href content
                        /*
                        <div class="list-item list-item-sq-small"><a href="/fr/akerna/logo/"><div><img class="img-logo-small" alt="Akerna transparent PNG icon" src="/img/128/KERN-cb85c910.png?t=1607351987"></div><div class="name">Akerna [KERN]</div><div class="tags"><span class="tag-png">PNG</span></div></a></div>
                        */
                        for(let j = 0; j < divs.length; j++){
                            // extract href, name and img src
                            let div = divs[j];
                            let href = div.children[0].attribs.href;
                            // extract xxx from href /fr/xxx/logo/
                            let textId = href.split("/")[2];
                            // name is in div with class name
                            let name = div.children[0].children[1].children[0].data;
                            // img src is in div
                            let imgSrc = div.children[0].children[0].children[0].attribs.src;

                            //console.log("textId : " + textId)
                            //console.log("name : " + name);
                            //console.log("imgSrc : " + imgSrc);
                            let infos = {textId: textId.trim(), name: name.trim(), imgSrc: imgSrc, category: i + 2};
                            caterogyData.push(infos);
                            await saveAndDownloadImg(infos);
                        }


                    

                } else {
                    console.log("Error : " + response.status);
                    continueLoop = false;
                }
            })
            .catch(error => {
                if(error.response.status == 404){
                    console.log("404");
                    continueLoop = false;
                } else {
                    console.log("error.response.status");
                    console.log(error.response.status);
                    continueLoop = false;
                }
            });
            page++;
            // at the end of the loop, we sync allData (replace the file with the new data)
            fs.writeFileSync('data.json', JSON.stringify(allData, null, 2));
        }
        console.log("Category " + category.name + " done");
        console.log("Category data : ");
        //console.log(caterogyData);

    }

}

async function main(){
    await extractLinks();
    console.log("All done");
}

main();