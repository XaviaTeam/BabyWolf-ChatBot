import fs from "fs"
import axios from "axios";

function reader(path: string) {
    return fs.createReadStream(path);
}

function isURL(url: string) {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(url);
}

function isExists(path: string, type = 'file') {
    try {
        const result = fs.statSync(path);
        return type === 'file' ? result.isFile() : result.isDirectory();
    } catch (e) {
        return false;
    }
}

function getStream(input: string) {
    return new Promise((resolve, reject) => {
        if (isExists(input)) {
            resolve(reader(input));
        } else {
            if (isURL(input)) {
                axios.get(input, { responseType: 'stream' })
                    .then(res => {
                        resolve(res.data);
                    })
                    .catch(err => {
                        reject(err);
                    });
            } else {
                reject(new Error('Invalid input'));
            }
        }
    })
}

export {
    reader,
    isURL,
    isExists,
    getStream
}