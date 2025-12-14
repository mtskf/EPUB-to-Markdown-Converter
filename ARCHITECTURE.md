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

1. **Iteration**: Loops through `epub.flow` (reading order).
2. **Anchor Injection (Pre-processing)**:
   - **Problem**: Turndown strips `id` attributes from headers/paragraphs, breaking internal links.
   - **Solution**: Before Markdown conversion, regex replaces elements with IDs:
     - Input: `<h1 id="intro">Title</h1>`
     - Output: `<h1 id="intro"><a id="intro"></a>Title</h1>`
   - This ensures a pure HTML anchor survives the conversion.

3. **Markdown Conversion (Turndown)**:
   - **Standard HTML**: Converted to Markdown.
   - **Proprietary/Complex Tags**: Handled by custom rules.

### D. Custom Turndown Rules

1. **Images (`img` & `<svg><image>`)**:
   - Intercepts image tags.
   - Resolves `src` using the `filenameMap` created during extraction.
   - Outputs: `![alt](assets/safe_filename.jpg)`.

2. **Internal Links (`a`)**:
   - **Problem**: Links point to file paths (`chapter2.xhtml#section1`) which don't exist in the merged Markdown.
   - **Solution**:
     - If link is external (`http`), keep as is.
     - If link is internal with a hash (`file.xhtml#id`), rewrite to local anchor (`#id`).
     - **Assumption**: IDs are unique across the document (mostly true for EPUBs).

3. **Anchor Preservation**:
   - Ensures the injected `<a id="..."></a>` tags are not stripped out.

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
