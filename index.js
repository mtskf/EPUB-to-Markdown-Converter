#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const EPub = require('epub2').EPub;
const TurndownService = require('turndown');
const readline = require('readline');

const turndownService = new TurndownService();

async function main() {
    const args = process.argv.slice(2);
    let inputFile = null;
    let overwrite = false;
    let keep = false;

    // Parse arguments
    for (const arg of args) {
        if (arg === '--overwrite') {
            overwrite = true;
        } else if (arg === '--keep') {
            keep = true;
        } else if (!arg.startsWith('--')) {
            inputFile = arg;
        }
    }

    if (!inputFile) {
        console.error('Usage: node index.js <input-file.epub> [--overwrite] [--keep]');
        process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file not found: ${inputFile}`);
        process.exit(1);
    }

    const inputDir = path.dirname(inputFile);
    const inputExt = path.extname(inputFile);
    const inputBase = path.basename(inputFile, inputExt);
    let outputFile = path.join(inputDir, `${inputBase}.md`);

    // Handle file existence
    if (fs.existsSync(outputFile)) {
        if (overwrite) {
            console.log(`Overwriting existing file: ${outputFile}`);
        } else if (keep) {
            let counter = 1;
            while (fs.existsSync(outputFile)) {
                outputFile = path.join(inputDir, `${inputBase}_${counter}.md`);
                counter++;
            }
            console.log(`File exists. Saving as: ${outputFile}`);
        } else {
            // Prompt user
            const overwriteAnswer = await promptUser(`File ${outputFile} already exists. Overwrite? (y/n): `);
            if (overwriteAnswer.trim().toLowerCase() === 'y') {
                console.log(`Overwriting existing file: ${outputFile}`);
            } else {
                const keepAnswer = await promptUser('Keep both (save as new file)? (y/n): ');
                if (keepAnswer.trim().toLowerCase() === 'y') {
                    let counter = 1;
                    while (fs.existsSync(outputFile)) {
                        outputFile = path.join(inputDir, `${inputBase}_${counter}.md`);
                        counter++;
                    }
                    console.log(`File exists. Saving as: ${outputFile}`);
                } else {
                    console.log('Cancelled.');
                    process.exit(0);
                }
            }
        }
    }

    console.log(`Converting ${inputFile} to ${outputFile}...`);

    try {
        const epub = await EPub.createAsync(inputFile);
        let markdownContent = '';

        // Add title if available
        if (epub.metadata && epub.metadata.title) {
            markdownContent += `# ${epub.metadata.title}\n\n`;
        }

        // Iterate over chapters
        // epub.flow is usually the reading order
        for (const chapter of epub.flow) {
            const chapterId = chapter.id;
            // Get chapter text
            const text = await getChapterText(epub, chapterId);
            if (text) {
                const markdown = turndownService.turndown(text);
                markdownContent += markdown + '\n\n---\n\n';
            }
        }

        fs.writeFileSync(outputFile, markdownContent);
        console.log(`Successfully converted to ${outputFile}`);

    } catch (error) {
        console.error('Conversion failed:', error);
        process.exit(1);
    }
}

function getChapterText(epub, chapterId) {
    return new Promise((resolve, reject) => {
        epub.getChapter(chapterId, (err, text) => {
            if (err) reject(err);
            else resolve(text);
        });
    });
}

function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

main();
