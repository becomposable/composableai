import { GoogleDriveFileStorage } from "./google-drive.js";

async function main() {

    const fileStorage = await GoogleDriveFileStorage.connectImpersonated();


    const blob = await fileStorage.resolve("gdrive://1dZixEpTEjD7FAMitgyEa6QtBnSF0C_cA");
    console.log("#####meta:", blob.metadata, await blob.exists());


    const buffer = await blob.readAsBuffer();
    console.log("#####buffer:", buffer.toString('utf8'));



    // const r = await fileStorage.drive.files.list({
    //     //driveId: '0AJ9-Mdvj6hICUk9PVA',
    //     //driveId: '0AGRe4qGFKnEUUk9PVA',
    //     driveId: '0ABDqfwlXmReuUk9PVA',
    //     supportsAllDrives: true,
    //     corpora: 'drive',
    //     includeItemsFromAllDrives: true,
    //     pageSize: 10,
    //     fields: 'nextPageToken, files(id, name, mimeType, version, webContentLink, createdTime, modifiedTime, description, md5Checksum, originalFilename)',
    // });
    // console.log('!!!!!!!!', r);

    // const file = await fileStorage.drive.files.get({
    //     //driveId: '0AJ9-Mdvj6hICUk9PVA',
    //     supportsAllDrives: true,
    //     //corpora: 'drive',
    //     //includeItemsFromAllDrives: true,
    //     fileId: "1dZixEpTEjD7FAMitgyEa6QtBnSF0C_cA",
    //     fields: 'id, name, mimeType, version, webContentLink, createdTime, modifiedTime, description, md5Checksum, originalFilename',
    // },)
    // console.log('???????file', file);

    // const rr = await fileStorage.drive.files.list({
    //     driveId: "1v0ZhL41I7Py_ymiax5HC3SRQXEEi7ZMyvXaGBaJXaq0",
    //     //driveId: '0AJ9-Mdvj6hICUk9PVA',
    //     supportsAllDrives: true,
    //     corpora: 'drive',
    //     includeItemsFromAllDrives: true,
    //     // fileId: "1v0ZhL41I7Py_ymiax5HC3SRQXEEi7ZMyvXaGBaJXaq0",
    //     // fields: 'id, name, mimeType, version, webContentLink, createdTime, modifiedTime, description, md5Checksum, originalFilename',
    // },)

    // console.log('===============', rr.data);




    //     console.log('>>>>>>>>>>>>>ZZZZ', r.statusText);
}


main().finally(() => {
    console.log('############ DONE');
})
