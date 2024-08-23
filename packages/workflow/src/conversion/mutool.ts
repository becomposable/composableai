import { log } from '@temporalio/activity';
import { spawn } from 'child_process';
import fs from 'fs';
import tmp from 'tmp';



export function mutoolPdfToText(buffer: Buffer): Promise<string> {

  const inputFile = tmp.fileSync({ postfix: '.pdf' });
  const targetFileName = tmp.tmpNameSync({ postfix: '.txt' });

  fs.writeSync(inputFile.fd, buffer);

  return new Promise((resolve, reject) => {


    log.info("Converting pdf to text", { inputFile: inputFile.name, targetFileName });
    
    console.log("Spawning mutool")
    const command = spawn("mutool", ["convert", "-o", targetFileName, inputFile.name]);

    command.on('exit', function (code) {
      console.log("Command exit")
      if (code) {
        reject(new Error(`mutool exited with code ${code}`));
      }
    });


    command.on('close', function (code) {
      console.log("Command close")
      if (code) {
        reject(new Error(`mutool exited with code ${code}`));
      } else {
        return fs.readFile(targetFileName, 'utf8', (err, data) => {
          if (err) {
            reject(err);
          }
          return resolve(data);
        });
      };
    });

    command.on('error', (err) => {
      reject(err);
    });

  });

}
