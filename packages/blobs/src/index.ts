import { GoogleDriveFileStorage } from "./google-drive.js";
import { GoogleFileStorage } from "./google.js";
import { md5 } from "./md5.js";

const Blobs = {

    async getStorage(uri: string) {

        if (uri.startsWith("gs://")) {
            return new GoogleFileStorage("zeno_objects");
        }
        if (uri.startsWith("gdrive://")) {
            return GoogleDriveFileStorage.connectImpersonated();
        }
        throw new Error(`Unsupported storage type for uri: ${uri}`);
    },

    async getFile(uri: string) {
        return await Blobs.getStorage(uri).then(storage => storage.resolve(uri));
    }

}

export {
    Blobs, md5
};
