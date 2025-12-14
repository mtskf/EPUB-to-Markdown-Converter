# EPUB to Markdown Converter

A robust Node.js tool to convert EPUB files into Markdown, optimized for **Obsidian** and personal knowledge bases.

## ✨ Key Features

This tool was built to solve specific pain points in EPUB conversion:

1.  **Obsidian-Optimized Markdown**:
    *   **ATX Headers**: Uses `# Heading` instead of underlined headers for outline compatibility.
    *   **Fenced Code Blocks**: Uses \`\`\` for code blocks instead of indentation.
    *   **Standard Lists**: Uses `-` for bullet points.

2.  **Robust Image Handling**:
    *   **Extraction**: Extracts all images to an `assets/` subfolder.
    *   **Collision Avoidance**: Automatically renames files like `image.jpg` to `image_1.jpg` to prevent overwrites.
    *   **SVG Support**: Correctly handles cover images embedded in SVG tags.

3.  **Internal Link Preservation**:
    *   **Anchor Injection**: Preserves HTML `id` attributes as `<a id="..."></a>` anchors so internal links work in Markdown.
    *   **Link Rewriting**: Converts `chapter.html#section` links to internal anchors `#section`, allowing seamless navigation within the merged Markdown file.

4.  **Metadata & Frontmatter**:
    *   Generates YAML Frontmatter (Title, Author, Publisher, etc.) by default.

5.  **User Experience**:
    *   **Progress Bar**: Visual feedback during conversion.
    *   **Comprehensive CLI**: Easy-to-use command line arguments.

## 🛠 Installation

```bash
git clone <repository-url>
cd epub2md
npm install
npm link
```

*Running `npm link` makes the `epub2md` command available globally.*

## 🚀 Usage

```bash
epub2md <input-file> [options]
```

### Options

*   `-o, --output <dir>`: Specify output directory (default: same as input input).
*   `--no-frontmatter`: Disable YAML Frontmatter generation.
*   `-h, --help`: Display help information.

### Example

```bash
epub2md my-book.epub -o ./MyNotes
```
Generates `./MyNotes/my-book.md` and `./MyNotes/assets/`.

## 🧪 Testing

The project includes a comprehensive integration test suite that generates a complex EPUB on-the-fly to verify:
- Structure & Frontmatter
- Link fixing (Internal and Footnotes)
- Image extraction
- Formatting (Lists, Code, Styles)

Run tests with:
```bash
npm test
```

## 🏗 Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed implementation notes and design decisions.
