import { expect, test, describe } from 'vitest';
import { GoogleDriveFileStorage, defaultTargetServiceAccount } from './google-drive';


describe('GoogleDriveFileStorage', async () => {
    const fileStorage = await GoogleDriveFileStorage.connectImpersonated();

    test("Fetch test.txt file", async () => {
        const blob = await fileStorage.resolve("gdrive://1dZixEpTEjD7FAMitgyEa6QtBnSF0C_cA");
        const itExists = await blob.exists();
        expect(itExists).toBe(true);

        const buffer = await blob.readAsBuffer();
        expect(buffer.toString('utf8')).toBe("Hello World!");
    });

    test("Fetch inexistent file", async () => {
        const blob = await fileStorage.resolve("gdrive://1dZixEpTEjD7FAMitgyEa6QtBnSF0C_FAKE");
        const itExists = await blob.exists();
        expect(itExists).toBe(false);

        blob.readAsBuffer().then(() => {
            throw new Error("Should have thrown an error");
        }).catch((err) => {
            expect(err).toBeDefined();
        });
    });

});

// test('getService should return an authenticated drive instance', async () => {
//   const fileStorage = await GoogleDriveFileStorage.connectImpersonated();
//   const about = await fileStorage.drive.about.get({
//     fields: 'user',
//   });

//   expect(about.data?.user?.emailAddress).toBe(defaultTargetServiceAccount);

//   const file = await fileStorage.drive.files.list({
//     driveId: '0AJ9-Mdvj6hICUk9PVA',
//     supportsAllDrives: true,
//     corpora: 'drive',
//     includeItemsFromAllDrives: true,
//     pageSize: 10,
//     fields: 'nextPageToken, files(id, name)',
//   });

//   expect(file.data.files).toBeDefined();

// });
