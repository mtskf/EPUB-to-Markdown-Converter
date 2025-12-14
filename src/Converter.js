const fs = require('fs');
const path = require('path');
const EPub = require('epub2').EPub;
const TurndownService = require('turndown');

class Converter {
    constructor(options = {}) {
        this.options = options;
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-'
        });
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

        // 2. Extract Images FIRST
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
        const imageReplacement = (content, node) => {
            const alt = node.getAttribute('alt') || '';
            let src = node.getAttribute('src') || node.getAttribute('xlink:href') || node.getAttribute('href');
            if (!src) return '';

            const basename = path.basename(src.split('?')[0]);
            const decodedBasename = decodeURIComponent(basename);

            // Default to decoded basename if not found
            const filename = this.filenameMap.get(decodedBasename) || decodedBasename;

            return `![${alt}](${this.assetsDir}/${filename})`;
        };

        this.turndownService.addRule('img', {
            filter: 'img',
            replacement: imageReplacement
        });

        this.turndownService.addRule('svg-image', {
            filter: 'image',
            replacement: imageReplacement
        });

        // Rewrite internal links
        this.turndownService.addRule('internal-links', {
            filter: 'a',
            replacement: (content, node) => {
                const href = node.getAttribute('href');
                if (!href) return content; // keep content if no href (e.g. anchor)

                // Check if it's an anchor link or internal file link
                if (href.startsWith('http') || href.startsWith('mailto:')) {
                    return `[${content}](${href})`;
                }

                // Internal link logic
                // 1. "page.html#section" -> "#section"
                // 2. "#section" -> "#section"
                // 3. "page.html" -> "" (or just text? link to top of logical page?)

                // We assume IDs are unique book-wide.
                const hashIndex = href.indexOf('#');
                if (hashIndex !== -1) {
                    const hash = href.substring(hashIndex); // "#section"
                    return `[${content}](${hash})`;
                }

                // If link to another file but no hash?
                // e.g. "chapter2.html".
                // We don't have an anchor for the top of the file unless we added one.
                // Not supported yet. Retain text only or partial link?
                // Returning just content effectively removes the broken link but keeps text.
                return content;
            }
        });

        // Ensure anchor tags (id only) are preserved?
        // Turndown default for 'a' without href is to return content?
        // We injected <a id="..."></a>. Content is empty.
        // We need a rule to PRESERVE <a id> tags.
        this.turndownService.addRule('anchors', {
            filter: (node) => node.nodeName === 'A' && node.hasAttribute('id') && !node.hasAttribute('href'),
            replacement: (content, node) => {
                return `<a id="${node.getAttribute('id')}"></a>`;
            }
        });
    }

    // REDO:
    // We cannot easily inject IDs without rewriting rules.
    // However, fixing links is the priority.
    // If links point to hashtags `#foo`...
    // We need the targets to exist.

    // Alternative: Pre-process HTML to inject `<a id="..."></a>` INSIDE the elements?
    // `<h1 id="foo">Title</h1>` -> `<h1><a id="foo"></a>Title</h1>`
    // Then Turndown converts inner content `Title` -> `Title`, matches `a` rule -> `<a>` kept?
    // Turndown keeps `a` tags? Or converts to link?
    // Empty `a` tags might be stripped.

    // Strategy:
    // 1. Rewrite `processChapters` to manipulate `text` (HTML string).
    // 2. Regex replace `id="([^"]+)"` with `id="$1"`. No change.
    // 3. Regex replace `<(h[1-6]|p|div|span|li)([^>]*?)id="([^"]+)"([^>]*?)>`
    //    with `<$1$2$4><a id="$3"></a>`
    //    Inserts anchor at start of content.
    // 4. Then Turndown runs. `a` tags need to be preserved if they are anchors.
    //    Turndown converts `<a href...>` to links. `<a id...>` (no href)?
    //    Usually ignored or stripped?
    //    Need to ensure `<a id>` is kept.

    // 5. Link rewriting:
    //    `<a href="other.html#foo">` -> `[text](#foo)`.

    // Let's implement this.

    async extractImages(epub) {
        if (!epub.manifest) return;
        const isTest = process.env.NODE_ENV === 'test';

        const usedFilenames = new Set();
        if(isTest) console.log('Starting image extraction...');

        for (const id in epub.manifest) {
            const item = epub.manifest[id];
            if (item['media-type'] && item['media-type'].startsWith('image/')) {
                if(isTest) console.log(`Extracting image: ${id}`);
                try {
                    const data = await this.getImageData(epub, id);
                    if(isTest) console.log(`Got data for: ${id}`);

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

                    const decodedOriginal = decodeURIComponent(originalBasename);
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
        const isTest = process.env.NODE_ENV === 'test';
        let bar;

        if (!isTest) {
            const cliProgress = require('cli-progress');
            bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            console.log('Converting chapters...');
        } else {
            console.log('Converting chapters (Test Mode)...');
        }

        if (epub.flow && epub.flow.length > 0) {
             if (bar) bar.start(epub.flow.length, 0);

            for (const chapter of epub.flow) {
                if (isTest) console.log(`Processing chapter: ${chapter.id}`);
                let text = await this.getChapterText(epub, chapter.id);
                if (text) {
                    // Pre-process HTML to inject anchors for elements with IDs
                    // Regex to find generic tags with id attribute
                    // <tag ... id="val" ...> -> <tag ... id="val" ...><a id="val"></a>
                    // Note: This duplicates the ID (on tag and on anchor).
                    // Browsers handle this ok usually? Or valid HTML?
                    // Actually duplicate IDs are invalid.
                    // Better: Remove ID from tag and put it on anchor?
                    // Risks breaking CSS?
                    // Let's just Add the anchor. Markdown doesn't care about the original tag's ID being lost in conversion.
                    // Turndown will strip the ID from <h1> anyway.
                    // So purely adding <a id="val"></a> before content is enough.

                    // Regex: <(tag)( attributes)id="([^"]+)"( attributes)>
                    // This is hard to match perfectly.
                    // Simplified: `id="([^"]+)"` -> match.

                    // Let's just try to catch h1-h6, p, div, span.
                    // text = text.replace(/<((?:h[1-6]|p|div|span|li)[^>]*) id="([^"]+)"([^>]*)>/gi, '<$1 id="$2"$3><a id="$2"></a>');

                    // Actually, if we just insert `<a id="xyz"></a>` at the start of the element content.
                    text = text.replace(/(<(?:h[1-6]|p|div|span|li|a)[^>]*\s+id=["']([^"']+)["'][^>]*>)/gi, '$1<a id="$2"></a>');

                    const markdown = this.turndownService.turndown(text);
                    textContent += markdown + '\n\n---\n\n';
                }
                if (bar) bar.increment();
            }
            if (bar) bar.stop();
        } else {
            console.warn('No chapters found in epub.flow');
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
