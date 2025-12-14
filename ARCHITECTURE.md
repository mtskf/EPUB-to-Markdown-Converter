# Architecture & Implementation Guide

This document provides a technical overview of the `epub2md` project. It is intended to help developers (and AI assistants) understand the design decisions, core logic, and implementation details.

## 1. System Overview

`epub2md` is a Node.js command-line tool that converts EPUB documents into Markdown, optimized for Obsidian and other modern Markdown editors.

### Directory Structure

- **`bin/epub2md.js`**: CLI Entry Point. Uses `commander` to parse arguments (`input`, `--output`, `--no-frontmatter`) and initializes the Converter.
- **`src/Converter.js`**: Core logic class. Handles the entire conversion pipeline.
- **`test/`**: Integration tests using `jest`.
- **`assets/`** (Generated): Stores extracted images relative to the markdown file.

## 2. Core Logic (`Converter.js`)

The `Converter` class orchestrates the conversion process in the following stages:

### A. Initialization
- Configures `TurndownService` for Obsidian-style Markdown:
  - **Headers**: ATX style (`# Title`)
  - **Code Blocks**: Fenced style (```)
  - **Lists**: Dash (`-`) bullet markers

### B. Image Extraction (`extractImages`)
**Goal**: Iterate through the EPUB manifest *before* processing text to extract all image assets.

1. **Discovery**: Scans `epub.manifest` for `image/*` media types.
2. **Collision Avoidance**:
   - EPUBs often use generic names like `image.jpg` in different folders.
   - We flatten the directory structure to a single `assets/` folder.
   - **Strategy**: If `image.jpg` exists, rename to `image_1.jpg`, `image_2.jpg`, etc.
   - **Mapping**: A `filenameMap` (`original path` -> `safe filename`) is maintained to resolve references later.

### C. Chapter Processing (`processChapters`)
**Goal**: Convert HTML content to Markdown while preserving structure and links.

1. **Pre-Indexing (`_preindexHeadingText`)**:
   - Scans all chapters before conversion
   - Builds `headingTextMap`: `id → heading text`
   - Enables accurate link resolution to heading text

2. **Anchor Preprocessing (`_preprocessAnchors`)**:
   - **Standalone Anchors**: `<a id="intro"></a><h1>Title</h1>` → `<h1 id="intro">Title</h1>`
   - **Chapter Titles**: Converts `<p class="chaptitle">` to `<h1>` headings
   - **Heading Promotion**: Promotes first heading to H1 if needed

3. **Markdown Conversion (Turndown)**:
   - **Standard HTML**: Converted to Markdown
   - **Custom Rules**: Handle images, links, footnotes

### D. Custom Turndown Rules

1. **Images (`img` & `<svg><image>`)**:
   - Resolves `src` using `filenameMap`
   - Adds `\n\n` spacing to prevent merging with headings
   - Output: `\n\n![alt](assets/filename.jpg)\n\n`

2. **Internal Links (`a`)**:
   - **Heading-Text Resolution**:
     - Extract ID from `href="#id"`
     - Lookup heading text from `headingTextMap`
     - Output: `[[#Heading Text|link text]]`
   - **External Links**: Preserved as-is
   - **Fallback**: Uses chapter anchors if heading not found

3. **Footnotes**:
   - **References**: `<a href="#note1">[1]</a>` → `[^note1]`
   - **Definitions**: `<p id="note1">[1] Content</p>` → `[^note1]: Content`
   - **Cleanup**: Removes `[1]` prefixes and back-links from definitions

## 3. Testing Strategy

- **Framework**: `jest`
- **Mechanism**:
  - We do *not* rely on a static `test.epub` because binary files are opaque.
  - **Dynamic Generation**: The test script generates a fresh EPUB using `epub-gen` on the fly.
  - This EPUB contains specific test cases:
    - Tables of Contents
    - Images (remote placeholder downloaded)
    - Internal Links & Footnotes
    - Complex text formatting
  - **Verification**: The test converts this generated EPUB and asserts specific patterns in the output Markdown.

## 4. Known Limitations

- **Complex Tables**: Converted to HTML tables by Turndown (standard behavior), which might look cluttered.
- **MathJax/LaTeX**: Not natively supported; rendered as text or original HTML.
- **CSS**: Completely ignored. Formatting relies on Semantic HTML tags (`h1`, `strong`, `em`).
