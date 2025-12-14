const fs = require('fs');
const path = require('path');
const EPub = require('epub2').EPub;
const TurndownService = require('turndown');

class Converter {
    constructor(options = {}) {
        this.options = options;
        this.turndownService = new TurndownService();
        // We will store mapping from 'basename' to 'filename' for Turndown
        // This is imperfect for collisions but best we can do without deep path resolution
        this.filenameMap = new Map();
        this.assetsDir = 'assets';
    }

    async convert(inputFile, outputDir) {
        this.inputFile = inputFile;
        this.outputDir = outputDir;
        this.assetsOutputDir = path.join(outputDir, this.assetsDir);

        console.log(`Reading EPUB: ${inputFile}`);
        const epub = await EPub.createAsync(inputFile);

        // 1. Prepare Output Directory
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.assetsOutputDir)) {
            fs.mkdirSync(this.assetsOutputDir, { recursive: true });
        }

        // 2. Extract Images FIRST (so we have the map for Turndown)
        await this.extractImages(epub);

        // 3. Extract Metadata & Frontmatter
        let content = '';
        if (!this.options.noFrontmatter) {
            content += this.generateFrontmatter(epub.metadata);
        } else if (epub.metadata && epub.metadata.title) {
             content += `# ${epub.metadata.title}\n\n`;
        }

        // 4. Configure Turndown
        this.configureTurndown();

        // 5. Process Chapters
        const chapters = await this.processChapters(epub);
        content += chapters;

        // 6. Write to File
        const outputFilename = path.basename(inputFile, path.extname(inputFile)) + '.md';
        const outputPath = path.join(outputDir, outputFilename);

        fs.writeFileSync(outputPath, content);
        console.log(`Saved Markdown to: ${outputPath}`);
        return outputPath;
    }

    generateFrontmatter(metadata) {
        if (!metadata) return '';
        const lines = ['---'];
        if (metadata.title) lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
        if (metadata.creator) lines.push(`author: "${metadata.creator.replace(/"/g, '\\"')}"`);
        if (metadata.publisher) lines.push(`publisher: "${metadata.publisher.replace(/"/g, '\\"')}"`);
        if (metadata.language) lines.push(`language: "${metadata.language}"`);
        if (metadata.date) lines.push(`date: "${metadata.date}"`);
        lines.push('tags: [epub, book]');
        lines.push('---');
        lines.push('');
        return lines.join('\n') + '\n';
    }

    configureTurndown() {
        this.turndownService.addRule('img', {
            filter: 'img',
            replacement: (content, node) => {
                const alt = node.getAttribute('alt') || '';
                const src = node.getAttribute('src');
                if (!src) return '';

                // transform src to asset path using our map
                const basename = path.basename(src.split('?')[0]);
                const decodedBasename = decodeURIComponent(basename);

                // Default to decoded basename if not found (fallback)
                const filename = this.filenameMap.get(decodedBasename) || decodedBasename;

                return `![${alt}](${this.assetsDir}/${filename})`;
            }
        });
    }

    async extractImages(epub) {
        if (!epub.manifest) return;

        const usedFilenames = new Set();

        for (const id in epub.manifest) {
            const item = epub.manifest[id];
            if (item['media-type'] && item['media-type'].startsWith('image/')) {
                try {
                    const data = await this.getImageData(epub, id);

                    // Determine safe filename
                    let originalBasename = path.basename(item.href);
                    let filename = originalBasename;
                    let ext = path.extname(filename);
                    let name = path.basename(filename, ext);

                    let counter = 1;
                    while (usedFilenames.has(filename)) {
                        filename = `${name}_${counter}${ext}`;
                        counter++;
                    }
                    usedFilenames.add(filename);

                    // Map the ORIGINAL basename to this new safe filename
                    // Use the decoded version for mapping keys as Turndown might see decoded
                    // actually item.href is usually URL encoded?
                    const decodedOriginal = decodeURIComponent(originalBasename);

                    // If multiple originals map to same basename, the last one wins in the map.
                    // This is the limitation of the 'basename' strategy.
                    // But at least the FILES don't overwrite on disk.
                    this.filenameMap.set(decodedOriginal, filename);

                    const destPath = path.join(this.assetsOutputDir, filename);
                    fs.writeFileSync(destPath, data);
                } catch (err) {
                    console.warn(`Warning: Could not extract image ${id}: ${err.message}`);
                }
            }
        }
    }

    async processChapters(epub) {
        let textContent = '';
        for (const chapter of epub.flow) {
            const text = await this.getChapterText(epub, chapter.id);
            if (text) {
                const markdown = this.turndownService.turndown(text);
                textContent += markdown + '\n\n---\n\n';
            }
        }
        return textContent;
    }

    getChapterText(epub, chapterId) {
        return new Promise((resolve) => {
            epub.getChapter(chapterId, (err, text) => {
                if (err) resolve('');
                else resolve(text);
            });
        });
    }

    getImageData(epub, id) {
        return new Promise((resolve, reject) => {
            epub.getImage(id, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }
}

module.exports = Converter;
