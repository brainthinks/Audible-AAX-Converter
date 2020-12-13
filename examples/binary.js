'use strict';

/**
 * This project was my first dive into binary data / files, including big and
 * little endianness.  Nothing fancy here, just making sure that when I use a
 * buffer to read and write files, the binary-ness is retained.
 */

const fs = require('fs');

// This can be anything - I searched "example binary file" on the internet.
// This file was a font file.
const pathToOriginalBinaryFile = './examples/slick.bin';

// The path to the file that I duplicate with node, hopefully 1-to-1 binary...
const pathToDuplicatedBinaryFile = './examples/slick2.bin';

async function main () {
  try {
    fs.unlinkSync(pathToDuplicatedBinaryFile);
  }
  catch (error) {
    // do nothing
    console.log('File didn\'t exist, moving on');
  }

  const pathToWrite = fs.createWriteStream(pathToDuplicatedBinaryFile);

  return new Promise((resolve, reject) => {
    pathToWrite.on('close', () => {
      // @todo - how to detect the reject condition?
      resolve();
    });

    pathToWrite.on('error', (error) => {
      console.error(error);
      console.error('error while writing binary file');
      pathToWrite.destroy();
    })

    pathToWrite.on('finish', () => {
      console.log('done writing binary file');
      pathToWrite.destroy();
    });

    // This will create a binary-correct copy.  Well that was easy...
    fs.createReadStream(pathToOriginalBinaryFile).pipe(pathToWrite);
  });
}

main().catch((error) => {
  console.error(error);
  console.error('Failed!  See error message(s) above');
  process.exit(1);
});
